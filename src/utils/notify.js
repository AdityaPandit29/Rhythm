import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { groupBusyBlocks } from "../utils/scheduling.js";

const loadAllBlocks = async (db) => {
  try {
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

    const tasks = await db.getAllAsync(`
      SELECT
        ts.start_minutes AS start_minutes,
        ts.end_minutes AS end_minutes,
        ts.date AS date,
        'task' AS type,
        t.id AS itemId,
        t.title AS title
      FROM task_schedules ts
      LEFT JOIN tasks t ON ts.taskId = t.id;
    `);

    return [...recurring, ...tasks];
  } catch (err) {
    console.error("❌ loadAllBlocks failed:", err);
    return [];
  }
};

/* =====================================================
   CONFIG
===================================================== */

const UPCOMING_OFFSET_MINUTES = 15;

/* =====================================================
   PUBLIC API (THIS IS WHAT YOU CALL)
===================================================== */

export async function rescheduleAllNotifications(db) {
  try {
    await cancelAllNotifications();
    await scheduleNotifications(db);
  } catch (err) {
    console.error("❌ rescheduleAllNotifications failed:", err);
  }
}

/* =====================================================
   CANCEL
===================================================== */

async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.error("❌ cancelAllNotifications failed:", err);
  }
}

/* =====================================================
   NOTIFICATIONS
===================================================== */

async function scheduleNotifications(db) {
  try {
    const blocks = await loadAllBlocks(db);
    const grouped = groupBusyBlocks(blocks);

    for (const block of grouped) {
      try {
        if (block.type === "task") {
          await scheduleTask(block);
        } else {
          await scheduleBlockNotifications(block);
        }
      } catch (err) {
        console.error("❌ Failed scheduling block:", block, err);
      }
    }
  } catch (err) {
    console.error("❌ scheduleNotifications failed:", err);
  }
}

/* =====================================================
   TASK NOTIFICATIONS
===================================================== */

async function scheduleTask(task) {
  try {
    if (!task.intervals || task.intervals.length === 0) return;

    const now = new Date();
    let start = null;

    for (const interval of task.intervals) {
      const candidate = buildDate(interval.date, interval.start);
      if (candidate > now && (!start || candidate < start)) {
        start = candidate;
      }
    }

    if (!start) return;

    await scheduleNotification({
      title: "Upcoming task",
      body: `Task starting soon: ${task.title}`,
      date: subtractMinutes(start, UPCOMING_OFFSET_MINUTES),
      data: { type: "task", taskId: task.id },
    });

    await scheduleNotification({
      title: "Task started",
      body: `Time to start: ${task.title}`,
      date: start,
      data: { type: "task", taskId: task.id },
    });
  } catch (err) {
    console.error("❌ scheduleTask failed:", task, err);
  }
}

/* =====================================================
   HABIT & ROUTINE NOTIFICATIONS
===================================================== */
function expandIntervalsToDates(intervals, daysAhead = 7) {
  const results = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOvernight =
    intervals.some((i) => i.end === 1440) &&
    intervals.some((i) => i.start === 0);

  let startMinutes,
    days = [];

  if (isOvernight) {
    const beforeMidnight = intervals.find((i) => i.end === 1440);
    startMinutes = beforeMidnight.start;
  } else {
    startMinutes = intervals[0].start;
  }

  intervals.forEach((interval) => {
    if (interval.start === startMinutes) days.push(interval.day);
  });

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const weekday = date.getDay(); // 0–6

    for (const day of days) {
      if (day === weekday) {
        results.push({
          date,
          start: startMinutes,
        });
      }
    }
  }

  return results;
}

async function scheduleBlockNotifications(block, daysAhead = 7) {
  try {
    const now = new Date();
    if (!block.intervals || block.intervals.length === 0) return;

    const occurrences = expandIntervalsToDates(block.intervals, daysAhead);

    for (const occ of occurrences) {
      try {
        const startDate = buildDate(occ.date, occ.start);
        if (startDate <= now) continue;

        const upcomingDate = subtractMinutes(
          startDate,
          UPCOMING_OFFSET_MINUTES,
        );

        if (upcomingDate > now) {
          await scheduleNotification({
            title: "Upcoming",
            body: `${capitalize(block.type)} starting in 15 minutes: ${block.title}`,
            date: upcomingDate,
            data: { type: block.type, id: block.id },
          });
        }

        await scheduleNotification({
          title: "Started",
          body: `Time to start: ${block.title}`,
          date: startDate,
          data: { type: block.type, id: block.id },
        });
      } catch (err) {
        console.error("❌ Failed occurrence:", occ, err);
      }
    }
  } catch (err) {
    console.error("❌ scheduleBlockNotifications failed:", block, err);
  }
}

/* =====================================================
   FREE TIME NOTIFICATIONS
===================================================== */

export async function scheduleFreeTimeNotification({ hasQuickTasks, date }) {
  try {
    if (!date || date < new Date()) return;

    const body = hasQuickTasks
      ? "You're free! You can complete some quick tasks now."
      : "You're free! Enjoy your time.";

    await scheduleNotification({
      title: "Free time",
      body,
      date,
      data: { type: "free" },
    });
  } catch (err) {
    console.error("❌ scheduleFreeTimeNotification failed:", err);
  }
}

/* =====================================================
   CORE SCHEDULER
===================================================== */

async function scheduleNotification({ title, body, date, data }) {
  try {
    if (!date || date < new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === "android" ? "default" : undefined,
      },
    });
  } catch (err) {
    console.error("❌ scheduleNotification failed:", { title, date }, err);
  }
}

/* =====================================================
   HELPERS
===================================================== */

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60 * 1000);
}

function buildDate(dateString, minutes) {
  if (!dateString && minutes == null) return null;

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  date.setHours(hrs, mins, 0, 0);
  return date;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function hasNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function rescheduleNotificationsIfAllowed(db) {
  try {
    const allowed = await hasNotificationPermission();

    if (!allowed) {
      return;
    }

    await rescheduleAllNotifications(db);
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch (err) {
    console.error("❌ Notification reschedule failed:", err);
  }
}
