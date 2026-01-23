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

export const intervalsOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && aEnd > bStart;

export const loadManualBlocks = async (db) => {
  const recurring = await db.getAllAsync(`
    SELECT 
      rs.start_minutes AS start_minutes,
      rs.end_minutes AS end_minutes,
      rs.day AS day,
      'routine' AS type,
      r.id AS itemId,
      r.title AS title
    FROM routine_schedules rs
    LEFT JOIN routines r ON rs.routineId = r.id

    UNION ALL

    SELECT 
      hs.start_minutes AS start_minutes,
      hs.end_minutes AS end_minutes,
      hs.day AS day,
      'habit' AS type,
      h.id AS itemId,
      h.title AS title
    FROM habit_schedules hs
    LEFT JOIN habits h ON hs.habitId = h.id
  `);

  const manualTasks = await db.getAllAsync(`
    SELECT
      ts.start_minutes AS start_minutes,
      ts.end_minutes AS end_minutes,
      ts.date AS date,
      'task' AS type,
      t.id AS itemId,
      t.title AS title
    FROM task_schedules ts
    LEFT JOIN tasks t ON ts.taskId = t.id
    WHERE t.is_auto = 0;
  `);

  return [...recurring, ...manualTasks];
};

export const groupBusyBlocks = (blocks) => {
  const grouped = {};

  blocks.forEach((row) => {
    const key = `${row.type}-${row.itemId}`;

    if (!grouped[key]) {
      grouped[key] = {
        type: row.type,
        id: row.itemId,
        title: row.title,
        intervals: [],
      };
    }

    if (row.day !== undefined) {
      grouped[key].intervals.push({
        day: row.day,
        start: row.start_minutes,
        end: row.end_minutes,
      });
    } else {
      grouped[key].intervals.push({
        date: row.date,
        start: row.start_minutes,
        end: row.end_minutes,
      });
    }
  });

  return Object.values(grouped);
};

export const getNextWorkingDate = (days) => {
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayDow = today.getDay();
  let nextDow = 0;

  for (let i = todayDow; i < todayDow + 7; i++) {
    if (days[i % 7]) {
      nextDow = i % 7;
      break;
    }
  }

  let nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + ((nextDow - todayDow + 7) % 7));

  return nextDate;
};

export const cleanupExpiredTasks = async (db) => {
  const now = new Date();
  // const today = now.toLocaleDateString("sv-SE");
  // const minutesNow = now.getHours() * 60 + now.getMinutes();

  const schedules = await db.getAllAsync(`
    SELECT taskId, date, end_minutes
    FROM task_schedules

    UNION ALL

    SELECT id AS taskId, deadline_date AS date, deadline_minutes AS end_minutes
    FROM tasks
    WHERE total_duration = 0

    ORDER BY taskId, date, end_minutes;
  `);

  const lastScheduleByTask = new Map();

  for (const row of schedules) {
    // Since rows are ordered, later rows overwrite earlier ones
    lastScheduleByTask.set(row.taskId, row);
  }

  const expiredTaskIds = [];

  for (const [taskId, row] of lastScheduleByTask.entries()) {
    const endTime = new Date(row.date);
    endTime.setHours(0, 0, 0, 0);
    endTime.setMinutes(row.end_minutes);

    if (endTime < now) {
      expiredTaskIds.push(taskId);
    }
  }

  if (expiredTaskIds.length === 0) return;

  const placeholders = expiredTaskIds.map(() => "?").join(",");

  await db.runAsync("BEGIN TRANSACTION");

  try {
    await db.runAsync(
      `DELETE FROM task_schedules WHERE taskId IN (${placeholders})`,
      expiredTaskIds,
    );

    await db.runAsync(
      `DELETE FROM tasks WHERE id IN (${placeholders})`,
      expiredTaskIds,
    );

    await db.runAsync("COMMIT");
  } catch (err) {
    await db.runAsync("ROLLBACK");
    throw err;
  }
};

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
  for (
    let d = new Date(startDate);
    d <= endDate;
    d = new Date(d.getTime() + 86400000)
  ) {
    const day = d.getDay();
    for (let i = 0; i < item.intervals.length; i++) {
      if (item.intervals[i].day != day) continue;

      const start = item.intervals[i].start;
      const end = item.intervals[i].end;

      addBlockToCalendar(calendar, d.toLocaleDateString("sv-SE"), start, end);
    }
  }
};

export const buildCalendar = ({ busyItems, scheduleStart, scheduleEnd }) => {
  const calendar = {};

  for (const item of busyItems) {
    if (item.type === "task") {
      // manual tasks already date-based
      for (let i = 0; i < item.intervals.length; i++) {
        // if (item.dates[i]) {
        const date = item.intervals[i].date;
        const start = item.intervals[i].start;
        const end = item.intervals[i].end;
        addBlockToCalendar(calendar, date, start, end);
        // }
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

// ============================================
// AUTHORITY CALCULATION
// ============================================
export const computeAuthority = ({
  priority = "Low",
  deadlineDate,
  deadlineMinutes,
  duration,
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
  const durationFactor = Math.log(Math.max(duration, 1)) / Math.log(10);

  // Final authority score
  const authority = priorityWeight * urgencyMultiplier * (1 + durationFactor);

  return authority;
};

// ============================================
// GET FREE SLOTS
// ============================================
export const getFreeSlots = (busyBlocks, currentTimeMinutes = 0) => {
  if (!busyBlocks || busyBlocks.length === 0) {
    // Start from currentTimeMinutes, not midnight
    return [{ start: currentTimeMinutes, end: 24 * 60 }];
  }

  const sorted = [...busyBlocks].sort((a, b) => a.start - b.start);
  const free = [];
  let currentFree = Math.max(0, currentTimeMinutes); // Start from now (15 mins past)

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

  // Filter out tiny slots (< MIN_CHUNK)
  return free.filter((slot) => slot.end - slot.start >= MIN_CHUNK);
};

// ============================================
// AUTO-SCHEDULER
// ============================================
export const autoSchedule = ({
  calendar,
  autoTasks,
  scheduleStart,
  scheduleEnd,
}) => {
  const results = [];
  const AUTO_EVENT_BUFFER = 20; // 20 min buffer before auto events
  // const START_FROM_CURRENT_TIME_BUFFER = 5;

  // Create mutable calendar copy
  const workingCalendar = { ...calendar };
  Object.keys(workingCalendar).forEach((key) => {
    workingCalendar[key] = [...(workingCalendar[key] || [])];
  });

  for (const task of autoTasks.sort((a, b) => b.authority - a.authority)) {
    const duration = task.totalMinutes;

    const taskDeadline = new Date(task.deadlineDate);
    taskDeadline.setHours(0, 0, 0, 0);
    taskDeadline.setMinutes(task.deadlineMinutes);

    // Calculate scheduling window
    const now = new Date();
    const daysToDeadline = Math.floor(
      (taskDeadline - now) / (1000 * 60 * 60 * 24),
    );
    const windowStartDays = Math.max(0, daysToDeadline - 7); // 7 days before deadline
    const windowEndDays = daysToDeadline;

    let scheduled = false;

    const scheduleStartDay = new Date(scheduleStart);
    scheduleStartDay.setHours(0, 0, 0, 0);

    // Try days chronologically until deadline
    for (
      let d = new Date(scheduleStart);
      d <= taskDeadline && !scheduled;
      d.setDate(d.getDate() + 1)
    ) {
      const dDay = new Date(d);
      dDay.setHours(0, 0, 0, 0);

      const daysFromScheduleStart = Math.floor(
        (dDay - scheduleStartDay) / (1000 * 60 * 60 * 24),
      );

      // SPREAD: Only schedule within window
      if (
        daysFromScheduleStart < windowStartDays ||
        daysFromScheduleStart > windowEndDays
      ) {
        continue; // Skip too early/too late
      }

      const dateKey = d.toLocaleDateString("sv-SE");
      const todayKey = now.toLocaleDateString("sv-SE");
      const currentTimeMinutes =
        dateKey === todayKey ? now.getHours() * 60 + now.getMinutes() : 0;
      const busy = workingCalendar[dateKey] || [];
      const freeSlots = getFreeSlots(busy, currentTimeMinutes);

      // Find ONE slot big enough for entire task

      for (const slot of freeSlots) {
        const slotStart = slot.start + AUTO_EVENT_BUFFER;
        if (slotStart >= 1440) continue;

        // OVERNIGHT CALCULATION
        const timeIntoNextDay = Math.max(0, slotStart + duration - 1440);
        let usableDuration = slot.end - slotStart;

        // CHECK NEXT DAY if overnight
        if (timeIntoNextDay > 0) {
          const nextDayKeyObj = new Date(d);
          nextDayKeyObj.setDate(nextDayKeyObj.getDate() + 1);
          const nextDayKey = nextDayKeyObj.toLocaleDateString("sv-SE");

          const nextDayBusy = workingCalendar[nextDayKey] || [];
          const nextDayFreeSlots = getFreeSlots(nextDayBusy);

          // Must have free slot at midnight next day
          const midnightFree = nextDayFreeSlots.find(
            (slot) => slot.start <= 0 && slot.end >= timeIntoNextDay,
          );

          if (!midnightFree) {
            continue; // Next day midnight busy → can't schedule overnight
          }

          usableDuration += timeIntoNextDay; // Now safe to add
        }

        // Must fit entire task (handle overnight)
        if (usableDuration < duration) continue;

        // OVERNIGHT DEADLINE CHECK
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
          throw new Error(`Cannot schedule "${task.title}" before deadline`);
        }

        // SCHEDULE OVERNIGHT TASK
        if (slotEndTime >= 1440) {
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
            (a, b) => a.start - b.start,
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
        `No suitable slot found for "${task.title}" before deadline.`,
      );
    }
  }

  return results;
};

export const rebalance = async (db, type, startDate, startMinutes) => {
  try {
    const blocks = await loadManualBlocks(db);
    const busyItems = groupBusyBlocks(blocks);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxEnd = new Date(today);
    maxEnd.setDate(maxEnd.getDate() + MAX_LOOKAHEAD_DAYS);
    const scheduleEnd = maxEnd;

    let existingAutoTasks = [];

    existingAutoTasks = await db.getAllAsync(
      `
      SELECT DISTINCT 
        t.id,
        t.title, 
        t.priority, 
        t.deadline_date, 
        t.deadline_minutes, 
        t.total_duration 
      FROM tasks t
      JOIN task_schedules ts
      ON t.id = ts.taskID 
      WHERE 
        t.is_auto = 1 
        AND 
          (ts.date > ? 
          OR 
          (ts.date = ? AND ts.end_minutes > ?)) 
        AND 
        t.total_duration > 0
    `,

      [startDate, startDate, startMinutes],
    );

    const mappedAutoTasks = existingAutoTasks.map((t) => ({
      id: t.id,
      title: t.title,
      totalMinutes: t.total_duration,
      priority: t.priority,
      deadlineDate: t.deadline_date,
      deadlineMinutes: t.deadline_minutes,
      authority: computeAuthority({
        priority: t.priority || "Low",
        deadlineDate: t.deadline_date,
        deadlineMinutes: t.deadline_minutes || 0,
        duration: t.total_duration,
      }),
    }));

    console.log(mappedAutoTasks);

    const calendar = buildCalendar({
      busyItems: busyItems,
      scheduleStart: today,
      scheduleEnd,
    });

    const scheduledResults = autoSchedule({
      calendar,
      autoTasks: mappedAutoTasks.sort((a, b) => b.authority - a.authority),
      scheduleStart: today,
      scheduleEnd,
    });

    // =====  CLEAR AUTO SCHEDULES =====
    const taskIds = mappedAutoTasks.map((t) => t.id);

    if (taskIds.length > 0) {
      await db.runAsync(
        `DELETE FROM task_schedules
        WHERE taskId IN (${taskIds.map(() => "?").join(",")})`,
        taskIds,
      );
    }

    for (const s of scheduledResults) {
      await db.runAsync(
        `INSERT INTO task_schedules
        (taskId, date, start_minutes, end_minutes, duration)
        VALUES (?, ?, ?, ?, ?)`,
        [
          s.taskId,
          s.date,
          s.start_minutes,
          s.end_minutes,
          s.end_minutes - s.start_minutes,
        ],
      );
    }
  } catch (err) {
    if (type !== "rebalance") {
      throw new Error(
        `Due to this ${type} some tasks will not meet their deadline.`,
      );
    } else {
      throw new Error(`Rebalance failed.`);
    }
  }
};
