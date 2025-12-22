// ============================================
// CONSTANTS
// ============================================
export const MAX_LOOKAHEAD_DAYS = 30;
export const DAY_MINUTES = 1440;
export const MIN_CHUNK = 15;

export const PRIORITY_WEIGHT = {
  High: 7,
  Low: 5,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
/**
 * Convert Date to YYYY-MM-DD format (safe for DB)
 */

// export function dateToYYYYMMDD(date) {
//   return date.toLocaleDateString("sv-SE"); // Always YYYY-MM-DD
// }

// ============================================
// CALENDAR BUILDING
// ============================================

/**
 * Add busy block to calendar
 */

const addBlockToCalendar = (calendar, date, start, end) => {
  const dateKey = date;

  if (!calendar[dateKey]) calendar[dateKey] = [];
  calendar[dateKey].push({ start, end });
};

const expandRecurringItem = ({ calendar, item, startDate, endDate }) => {
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (!item.days || !item.days.includes(day)) continue;

    const start = item.start_minutes;
    const end = item.end_minutes;
    // console.log(typeof d);

    if (start < end) {
      addBlockToCalendar(calendar, d.toLocaleDateString("sv-SE"), start, end);
    } else {
      // overnight
      addBlockToCalendar(
        calendar,
        d.toLocaleDateString("sv-SE"),
        start,
        DAY_MINUTES
      );
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      addBlockToCalendar(calendar, next.toLocaleDateString("sv-SE"), 0, end);
    }
  }
};

export const buildCalendar = ({ busyItems, scheduleStart, scheduleEnd }) => {
  const calendar = {};

  for (const item of busyItems) {
    if (item.type === "task") {
      // manual tasks already date-based
      for (let i = 0; i < item.dates.length; i++) {
        if (item.dates[i]) {
          const date = item.dates[i];
          const start = item.start_minutes[i];
          const end = item.end_minutes[i];
          addBlockToCalendar(calendar, date, start, end);
        }
      }
    } else {
      expandRecurringItem({
        calendar,
        item,
        startDate: scheduleStart,
        endDate: scheduleEnd,
      });
    }
  }

  // sort blocks per day
  for (const day in calendar) {
    calendar[day].sort((a, b) => a.start - b.start);
  }

  return calendar;
};

/**
 * Compute task authority (urgency)
 * Factors: deadline proximity, priority, duration
 * Higher = schedule sooner
 */
export const computeAuthority = ({
  priority = "Low",
  deadlineDate,
  deadlineMinutes,
  duration_left,
}) => {
  const now = new Date();
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  deadline.setMinutes(deadlineMinutes);

  // Days until deadline
  const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);

  // Priority weight
  const priorityWeight =
    {
      High: 3,
      Low: 1,
    }[priority] || 1;

  // Improved Urgency multiplier by time buckets
  const urgencyMultiplier =
    daysUntil <= 1
      ? 10
      : daysUntil <= 3
      ? 6
      : daysUntil <= 7
      ? 4
      : daysUntil <= 14
      ? 2.5
      : daysUntil <= 28
      ? 1.5
      : 1;

  // Duration factor (longer tasks need earlier scheduling)
  const durationFactor = Math.log(Math.max(duration_left, 1)) / Math.log(10);

  // Final authority score
  const authority = priorityWeight * urgencyMultiplier * (1 + durationFactor);

  return authority;
};

/**
 * Round duration to human-friendly chunks
 * 30, 40, 45, 50, 60, 75, 90, 120, 150 minutes
 */
const FRIENDLY_DURATIONS = [30, 40, 45, 50, 60, 75, 90, 120, 150, 180];

export const roundToFriendlyDuration = (available, remaining) => {
  // Filter ONLY friendly durations <= available
  const possible = FRIENDLY_DURATIONS.filter(
    (d) => d <= available && d <= remaining
  );

  console.log("possible : ", possible);

  if (possible.length === 0) {
    return available; // Nothing fits
  }

  // Return largest possible friendly duration
  return Math.max(...possible);
};

/**
 * Calculate ideal daily allocation
 * Spreads task across multiple days for better life balance
 */
const calculateIdealDailyAllocation = (
  remaining,
  daysAvailable,
  minDailyAllocation = 15,
  maxDailyAllocation = 180
) => {
  if (daysAvailable <= 0) return remaining;

  const perDay = remaining / daysAvailable; // days available?

  // If fits in one day comfortably
  if (perDay <= maxDailyAllocation) {
    return Math.max(minDailyAllocation, perDay);
  }

  // Otherwise spread across more days
  return maxDailyAllocation;
};

/**
 * Helper: Get free time slots from busy blocks
 */
export const getFreeSlots = (busyBlocks, currentTimeMinutes = 0) => {
  if (!busyBlocks || busyBlocks.length === 0) {
    // ✅ Start from currentTimeMinutes, not midnight
    return [{ start: currentTimeMinutes, end: 24 * 60 }];
  }

  const sorted = [...busyBlocks].sort((a, b) => a.start - b.start);
  const free = [];
  let currentFree = Math.max(0, currentTimeMinutes); // ✅ Start from now (15 mins past)

  for (const block of sorted) {
    // Skip blocks completely before current time
    if (block.end <= currentFree) continue;

    if (block.start > currentFree) {
      free.push({ start: currentFree, end: block.start });
    }
    currentFree = Math.max(currentFree, block.end);
  }

  if (currentFree < 24 * 60) {
    free.push({ start: currentFree, end: 24 * 60 });
  }

  // ✅ Filter out tiny slots (< MIN_CHUNK)
  return free.filter((slot) => slot.end - slot.start >= MIN_CHUNK);
};

/**
 * Auto-schedule tasks with even distribution
 */
export const autoSchedule = ({
  calendar,
  autoTasks,
  scheduleStart,
  scheduleEnd,
}) => {
  const results = [];
  const AUTO_EVENT_BUFFER = 20; // 10 min buffer before auto events
  const START_FROM_CURRENT_TIME_BUFFER = 5;

  // Create mutable calendar copy
  const workingCalendar = { ...calendar };
  Object.keys(workingCalendar).forEach((key) => {
    workingCalendar[key] = [...(workingCalendar[key] || [])];
  });

  // console.log("1");

  for (const task of autoTasks.sort((a, b) => b.authority - a.authority)) {
    const duration = task.totalMinutes;

    console.log("task : ", task);

    const taskDeadline = new Date(task.deadlineDate);
    taskDeadline.setHours(0, 0, 0, 0);
    taskDeadline.setMinutes(task.deadlineMinutes);

    // ✅ Calculate scheduling window

    const now = new Date();
    const daysToDeadline = Math.floor(
      (taskDeadline - now) / (1000 * 60 * 60 * 24)
    );
    const windowStartDays = Math.max(0, daysToDeadline - 3); // 3 days before deadline
    const windowEndDays = daysToDeadline;

    let scheduled = false;

    // ✅ Try days chronologically until deadline

    for (
      let d = new Date(scheduleStart);
      d <= taskDeadline && !scheduled;
      d.setDate(d.getDate() + 1)
    ) {
      const daysFromNow = Math.floor((d - now) / (1000 * 60 * 60 * 24));
      // ✅ SPREAD: Only schedule within window
      if (daysFromNow < windowStartDays || daysFromNow > windowEndDays) {
        continue; // Skip too early/too late
      }

      const dateKey = d.toLocaleDateString("sv-SE");
      const todayKey = now.toLocaleDateString("sv-SE");
      const currentTimeMinutes =
        dateKey === todayKey
          ? now.getHours() * 60 +
            now.getMinutes() +
            START_FROM_CURRENT_TIME_BUFFER
          : 0;
      const busy = workingCalendar[dateKey] || [];
      const freeSlots = getFreeSlots(busy, currentTimeMinutes);

      // ✅ Find ONE slot big enough for entire task
      for (const slot of freeSlots) {
        const slotStart = slot.start + AUTO_EVENT_BUFFER;
        if (slotStart >= 1440) continue;

        // ✅ OVERNIGHT CALCULATION
        const timeIntoNextDay = Math.max(0, slotStart + duration - 1440);
        const usableDuration = slot.end - slotStart + timeIntoNextDay;

        // Must fit entire task (handle overnight)
        if (usableDuration < duration) continue;

        // ✅ OVERNIGHT DEADLINE CHECK
        const slotEndTime = slotStart + duration;
        let endDateTime;

        if (slotEndTime <= 1440) {
          // Same day
          endDateTime = new Date(dateKey);
          endDateTime.setHours(0, 0, 0, 0);
          endDateTime.setMinutes(slotEndTime);
        } else {
          // Overnight - ends next day
          let nextDayKey = new Date(d);
          nextDayKey.setDate(nextDayKey.getDate() + 1);
          nextDayKey = nextDayKey.toLocaleDateString("sv-SE");
          endDateTime = new Date(nextDayKey);
          endDateTime.setHours(0, 0, 0, 0);
          endDateTime.setMinutes(slotEndTime - 1440);
        }

        if (endDateTime > taskDeadline) {
          throw new Error(
            `Cannot schedule "${task.title}" (${duration}min) before deadline`
          );
        }

        // ✅ SCHEDULE OVERNIGHT TASK
        if (slotEndTime > 1440) {
          // Split across midnight
          const firstPartDuration = 1440 - slotStart;
          const secondPartDuration = duration - firstPartDuration;
          // Part 1: Today
          results.push({
            taskId: task.id,
            date: dateKey,
            start_minutes: slotStart,
            end_minutes: 1440,
          });

          busy.push({ start: slotStart, end: 1440 });

          // Part 2: Tomorrow
          let nextDayKey = new Date(d);
          nextDayKey.setDate(nextDayKey.getDate() + 1);
          nextDayKey = nextDayKey.toLocaleDateString("sv-SE");
          let nextDayBusy = workingCalendar[nextDayKey] || [];

          results.push({
            taskId: task.id,
            date: nextDayKey,
            start_minutes: 0,
            end_minutes: secondPartDuration,
          });

          nextDayBusy.push({ start: 0, end: secondPartDuration });
          workingCalendar[nextDayKey] = nextDayBusy.sort(
            (a, b) => a.start - b.start
          );
        } else {
          // Same day
          results.push({
            taskId: task.id,
            date: dateKey,
            start_minutes: slotStart,
            end_minutes: slotStart + duration,
          });

          busy.push({ start: slotStart, end: slotStart + duration });
        }

        busy.sort((a, b) => a.start - b.start);
        workingCalendar[dateKey] = busy;

        scheduled = true;

        break;
      }
    }

    if (!scheduled) {
      throw new Error(
        `"${task.title}" (${duration}min): No suitable slot found`
      );
    }
  }

  return results;
};
