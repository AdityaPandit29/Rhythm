// ============================================
// CONSTANTS
// ============================================
export const MAX_LOOKAHEAD_DAYS = 60;
export const DAY_MINUTES = 1440;
export const MIN_CHUNK = 15;
export const AUTO_EVENT_BUFFER = 5;

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

/**
 * Parse Indian date string to Date object
 * Example: "23/12/2025" → new Date(2025, 11, 23)
 */
export function parseIndianDate(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Compute task authority (priority + deadline urgency)
 * Higher = more urgent
 */
export function computeAuthority(item) {
  const priorityScore = PRIORITY_WEIGHT[item.priority];
  const urgencyScore = deadlineUrgency(item.deadline);
  return priorityScore + urgencyScore;
}

/**
 * Calculate urgency based on minutes until deadline
 */
function deadlineUrgency(deadline) {
  const minutesLeft = (new Date(deadline).getTime() - Date.now()) / 60000;

  if (minutesLeft <= 24 * 60) return 6; // < 1 day
  if (minutesLeft <= 3 * 24 * 60) return 5; // < 3 days
  if (minutesLeft <= 7 * 24 * 60) return 4; // < 7 days
  if (minutesLeft <= 15 * 24 * 60) return 3; // < 15 days
  if (minutesLeft <= 30 * 24 * 60) return 2; // < 30 days
  return 1; // relaxed
}

// ============================================
// CALENDAR BUILDING
// ============================================

/**
 * Add busy block to calendar
 */

const addBlockToCalendar = (calendar, date, start, end) => {
  const dateKey = dateToYYYYMMDD(date);

  if (!calendar[dateKey]) calendar[dateKey] = [];

  calendar[dateKey].push({ start, end });
};

const expandRecurringItem = ({ calendar, item, startDate, endDate }) => {
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (!item.days || !item.days.includes(day)) continue;

    const start = item.start_minutes;
    const end = item.end_minutes;

    if (start < end) {
      addBlockToCalendar(calendar, d, start, end);
    } else {
      // overnight
      addBlockToCalendar(calendar, d, start, DAY_MINUTES);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      addBlockToCalendar(calendar, next, 0, end);
    }
  }
};

const buildCalendar = ({ busyItems, scheduleStart, scheduleEnd }) => {
  const calendar = {};

  for (const item of busyItems) {
    if (item.type === "task") {
      // manual tasks already date-based
      for (let i = 0; i < item.dates.length; i++) {
        if (item.dates[i]) {
          const date = parseIndianDate(item.dates[i]);
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

const getFreeSlots = (busy) => {
  const slots = [];
  let cursor = 0;

  for (const block of busy) {
    if (block.start > cursor) {
      slots.push({ start: cursor, end: block.start });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < DAY_MINUTES) {
    slots.push({ start: cursor, end: DAY_MINUTES });
  }

  return slots;
};

export const autoSchedule = ({
  calendar,
  autoTasks,
  scheduleStart,
  scheduleEnd,
}) => {
  const results = [];

  autoTasks.sort((a, b) => b.authority - a.authority);

  for (const task of autoTasks) {
    let remaining = task.duration_left;

    for (
      let d = new Date(scheduleStart);
      d <= new Date(task.deadline) && remaining > 0;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = dateToYYYYMMDD(d);
      const busy = calendar[dateKey] || [];
      const freeSlots = getFreeSlots(busy);

      for (const slot of freeSlots) {
        // Apply buffer at start of auto events
        const slotStart = slot.start + AUTO_EVENT_BUFFER;
        const available = slot.end - slotStart;
        if (available < MIN_CHUNK && remaining > MIN_CHUNK) continue;

        const use = Math.min(available, remaining);

        results.push({
          taskId: task.id,
          date: dateKey,
          start_minutes: slotStart,
          end_minutes: slotStart + use,
        });

        // mark busy
        busy.push({ start: slotStart, end: slotStart + use });
        busy.sort((a, b) => a.start - b.start);
        calendar[dateKey] = busy;

        remaining -= use;
        if (remaining <= 0) break;
      }
    }

    if (remaining > 0) {
      throw new Error(`Not enough time for "${task.title}"`);
    }
  }

  return results;
};
