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
 * Compute task authority (priority + deadline urgency)
 * Higher = more urgent
 */
export function computeAuthority(item) {
  const priorityScore = PRIORITY_WEIGHT[item.priority];
  const urgencyScore = deadlineUrgency(item.deadlineDate, item.deadlineMinutes);
  return priorityScore + urgencyScore;
}

/**
 * Calculate urgency based on minutes until deadline
 */
function deadlineUrgency(deadlineDate, deadlineMinutes) {
  // sv-SE "2025-12-22" → directly parseable
  const deadlineFull = new Date(deadlineDate);
  deadlineFull.setHours(0, 0, 0, 0);
  deadlineFull.setMinutes(deadlineMinutes);

  const minutesLeft = (deadlineFull.getTime() - Date.now()) / 60000;

  if (minutesLeft <= 24 * 60) return 6; // < 1 day ⚠️
  if (minutesLeft <= 3 * 24 * 60) return 5; // < 3 days ⚠️
  if (minutesLeft <= 7 * 24 * 60) return 4; // < 7 days
  if (minutesLeft <= 15 * 24 * 60) return 3; // < 15 days
  if (minutesLeft <= 30 * 24 * 60) return 2; // < 30 days
  return 1;
}

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
      d <= new Date(task.deadline);
      d.setDate(d.getDate() + 1)
    ) {
      if (task.allowedDays[d.getDay()]) {
        validDates.push(new Date(d));
      }
    }

    /* ---------- DAY-WISE DISTRIBUTION ---------- */

    for (let i = 0; i < validDates.length && remaining > 0; i++) {
      const date = validDates[i];
      const dateKey = date.toLocaleDateString("sv-SE");
      const busy = calendar[dateKey] || [];
      const freeSlots = getFreeSlots(busy);
      const remainingDays = validDates.length - i;
      const idealToday = Math.ceil(remaining / remainingDays);
      let allocatedToday = 0;

      for (let slot of freeSlots) {
        // Apply buffer at start of auto events
        const slotStart = slot.start + AUTO_EVENT_BUFFER;
        const slotDuration = slot.end - slotStart;

        // Skip tiny slots unless finishing
        if (slotDuration < MIN_CHUNK && remaining > slotDuration) continue;

        const usable = Math.min(
          idealToday - allocatedToday, // soft limit
          remaining,
          slotDuration
        );

        // Enforce minimum chunk unless this finishes the item
        if (usable < MIN_CHUNK && usable !== remaining) continue;

        /* ---------- SAVE SCHEDULE ---------- */

        scheduledResults.push({
          taskId: task.id,
          date: dateKey,
          start: slotStart,
          end: slotStart + usable,
        });

        /* ---------- MARK BUSY ---------- */
        addBlock(dateKey, slotStart, slotStart + usable);
        allocatedToday += usable;
        remaining -= usable;

        // Stop if we met today's fair share
        if (allocatedToday >= idealToday) break;
      }
    }

    /* ---------- FINAL CHECK ---------- */

    if (remaining > 0) {
      throw new Error(
        `Not enough time to schedule "${item.title}" before deadline`
      );
    }
  }

  return results;
};

if (isAuto) {
  /* ---------- DEADLINE VALIDATION ---------- */

  // Deadline date is before today (ignore time)
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDay = new Date(deadlineDate);
  deadlineDay.setHours(0, 0, 0, 0);

  // Combine deadline date + time
  const deadlineFull = new Date(deadlineDate);
  deadlineFull.setHours(0, 0, 0, 0);
  deadlineFull.setMinutes(deadlineMinutes);

  if (
    deadlineDay < today ||
    (deadlineDay.getTime() === today.getTime() && deadlineFull < now)
  ) {
    Alert.alert("Invalid Deadline", "Deadline cannot be in the past.");
  }
  const totalMinutes = selectedHours * 60 + selectedMinutes;

  // quick task
  if (totalMinutes === 0) {
    if (mode === "add") {
      await db.runAsync(
        `INSERT INTO tasks
                (title, priority, is_auto, deadline_date, deadline_minutes, total_duration, duration_left, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskName.trim(),
          null,
          1,
          deadlineDate.toLocaleDateString("sv-SE"),
          deadlineMinutes,
          0,
          null,
          new Date().toLocaleDateString(),
        ]
      );
    } else {
      const taskId = existing.id;

      await db.runAsync(`DELETE FROM task_schedules WHERE taskId = ?`, [
        taskId,
      ]);

      await db.runAsync(
        `UPDATE tasks SET
                title=?, priority=?, is_auto=?, deadline_date=?, deadline_minutes=?, total_duration=?, duration_left=?
              WHERE id=?`,
        [
          taskName.trim(),
          null,
          1,
          deadlineDate.toLocaleDateString("sv-SE"),
          deadlineMinutes,
          0,
          null,
          taskId,
        ]
      );
    }
  } else {
    const newAuthority = computeAuthority({
      priority,
      deadlineDate: deadlineDate.toLocaleDateString("sv-SE"),
      deadlineMinutes: deadlineMinutes,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxEnd = new Date(today);
    maxEnd.setDate(maxEnd.getDate() + MAX_LOOKAHEAD_DAYS);

    const scheduleEnd = maxEnd;
    try {
      await db.runAsync("BEGIN TRANSACTION");

      // ===== 1. SAVE TASK FIRST (get taskId) =====
      let taskId;
      const deadlineDateStr = deadlineDate.toLocaleDateString("sv-SE");

      if (mode === "edit") {
        taskId = existing.id;
        await db.runAsync(
          `UPDATE tasks SET
         title=?, priority=?, is_auto=1, deadline_date=?, deadline_minutes=?, total_duration=?, duration_left=?
         WHERE id=?`,
          [
            taskName.trim(),
            priority,
            deadlineDateStr,
            deadlineMinutes,
            totalMinutes,
            totalMinutes,
            taskId,
          ]
        );

        // Free current task's existing schedules
        await db.runAsync(`DELETE FROM task_schedules WHERE taskId = ?`, [
          taskId,
        ]);
      } else {
        const insertResult = await db.runAsync(
          `INSERT INTO tasks
         (title, priority, is_auto, deadline_date, deadline_minutes, total_duration, duration_left, created_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
          [
            taskName.trim(),
            priority,
            deadlineDateStr,
            deadlineMinutes,
            totalMinutes,
            totalMinutes,
            new Date().toISOString(),
          ]
        );
        taskId = insertResult.lastInsertRowId;
      }

      let existingAutoTasks = [];

      existingAutoTasks = await db.getAllAsync(
        `SELECT * FROM tasks
          WHERE is_auto = 1 AND duration_left > 0 AND id != ?
          `,
        [taskId]
      );

      const mappedAutoTasks = existingAutoTasks.map((t) => ({
        id: t.id,
        title: t.title,
        duration_left: t.duration_left,
        deadlineDate: t.deadline_date,
        deadlineMinutes: t.deadline_minutes,
        authority: computeAuthority({
          priority: t.priority,
          deadlineDate: t.deadline_date,
          deadlineMinutes: deadlineMinutes,
        }),
      }));

      const fixedAutoTasks = [];
      const reschedulableTasks = [];

      for (const t of mappedAutoTasks) {
        if (t.authority > newAuthority) {
          fixedAutoTasks.push(t);
        } else {
          reschedulableTasks.push(t);
        }
      }

      // push current task
      reschedulableTasks.push({
        id: taskId,
        title: taskName.trim(),
        duration_left: totalMinutes,
        deadlineDate: deadlineDateStr,
        deadlineMinutes: deadlineMinutes,
        authority: newAuthority,
      });

      // ===== 6. GET FIXED SCHEDULES =====
      const fixedIds = fixedAutoTasks.map((t) => t.id);
      let fixedSchedulesRow = [];

      if (fixedIds.length > 0) {
        fixedSchedulesRow = await db.getAllAsync(
          `SELECT 
          ts.start_minutes AS start_minutes,
          ts.end_minutes AS end_minutes,
          ts.date AS date,
          'task' AS type,
          t.id AS itemId,
          t.title AS title
         FROM task_schedules ts
         JOIN tasks t ON ts.taskId = t.id
         WHERE ts.taskId IN (${fixedIds.map(() => "?").join(",")})`,
          fixedIds
        );
      }

      const fixedSchedules = groupBusyBlocks([], fixedSchedulesRow);
      const fixedItems = [...busyItems, ...fixedSchedules];

      // ===== 7. BUILD CALENDAR & SCHEDULE =====
      const calendar = buildCalendar({
        busyItems: fixedItems,
        scheduleStart: today,
        scheduleEnd,
      });

      const scheduledResults = autoSchedule({
        calendar,
        autoTasks: reschedulableTasks.sort((a, b) => b.authority - a.authority),
        scheduleStart: today,
        scheduleEnd,
      });

      // ===== 8. CLEAR AFFECTED SCHEDULES =====
      const affectedTaskIds = reschedulableTasks
        .filter((t) => t.id !== null)
        .map((t) => t.id);

      if (affectedTaskIds.length > 0) {
        await db.runAsync(
          `DELETE FROM task_schedules
         WHERE taskId IN (${affectedTaskIds.map(() => "?").join(",")})`,
          affectedTaskIds
        );
      }

      // ===== 9. INSERT NEW SCHEDULES =====
      for (const s of scheduledResults) {
        await db.runAsync(
          `INSERT INTO task_schedules
         (taskId, date, start_minutes, end_minutes, duration)
         VALUES (?, ?, ?, ?, ?)`,
          [
            s.taskId, // All have real IDs now
            s.date,
            s.start_minutes,
            s.end_minutes,
            s.end_minutes - s.start_minutes,
          ]
        );
      }

      await db.runAsync("COMMIT");
    } catch (err) {
      await db.runAsync("ROLLBACK");

      Alert.alert(
        "Scheduling failed",
        err.message || "Could not reschedule task"
      );
    }
  }
}
