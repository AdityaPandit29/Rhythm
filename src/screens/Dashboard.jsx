import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { groupBusyBlocks } from "../utils/scheduling.js";
import { useSQLiteContext } from "expo-sqlite";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

const START_WINDOW_RATIO = 0.2; // 20% of duration

const loadAllBlocks = async (db) => {
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
    LEFT JOIN tasks t ON ts.taskId = t.id
    WHERE (t.is_auto = 0) OR (t.is_auto == 1 AND t.total_duration != 0);
  `);

  return [...recurring, ...tasks];
};

const todayKey = () => new Date().toLocaleDateString("sv-SE");

const tomorrowKey = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
};

const minutesNow = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

const getCurrentBlock = (blocks) => {
  const nowMin = minutesNow();
  const today = todayKey();
  const tomorrow = tomorrowKey();
  const todayDay = new Date().getDay();
  const tomorrowDay = (todayDay + 1) % 7;

  const windowEndMin = nowMin + 15;

  let upcomingCandidate = null;

  for (const block of blocks) {
    for (const interval of block.intervals) {
      /* ===========================
         TASKS (date based)
      =========================== */
      if (block.type === "task") {
        const { date, start, end } = interval;

        // Handle overnight split task (already split in DB)
        const isToday = date === today;
        const isTomorrow = date === tomorrow;

        /* ---- ONGOING ---- */
        if (isToday && nowMin >= start && nowMin < end) {
          return {
            status: "ongoing",
            type: block.type,
            id: block.id,
            title: block.title,
            start,
          };
        }

        /* ---- UPCOMING ---- */
        if (isToday && start > nowMin && start <= windowEndMin) {
          if (!upcomingCandidate || start < upcomingCandidate.start) {
            upcomingCandidate = {
              status: "upcoming",
              type: block.type,
              id: block.id,
              title: block.title,
              start,
            };
          }
        }

        // Midnight crossing case (11:59 → 00:02)
        if (isTomorrow && windowEndMin >= 1440) {
          const overflow = windowEndMin - 1440;
          if (
            start <= overflow &&
            (!upcomingCandidate || start + 1440 < upcomingCandidate.start)
          ) {
            upcomingCandidate = {
              status: "upcoming",
              type: block.type,
              id: block.id,
              title: block.title,
              start: start + 1440,
            };
          }
        }
      } else {
        /* ===========================
         HABITS / ROUTINES (weekly)
      =========================== */
        const { day, start, end } = interval;

        // Handle overnight split task (already split in DB)
        const isToday = day === todayDay;
        const isTomorrow = day === tomorrowDay;

        /* ---- ONGOING ---- */
        if (isToday && nowMin >= start && nowMin < end) {
          return {
            status: "ongoing",
            type: block.type,
            id: block.id,
            title: block.title,
            start,
          };
        }

        /* ---- UPCOMING ---- */
        if (isToday && start > nowMin && start <= windowEndMin) {
          if (!upcomingCandidate || start < upcomingCandidate.start) {
            upcomingCandidate = {
              status: "upcoming",
              type: block.type,
              id: block.id,
              title: block.title,
              start,
            };
          }
        }

        // Midnight crossing case (11:59 → 00:02)
        if (isTomorrow && windowEndMin >= 1440) {
          const overflow = windowEndMin - 1440;
          if (
            start <= overflow &&
            (!upcomingCandidate || start + 1440 < upcomingCandidate.start)
          ) {
            upcomingCandidate = {
              status: "upcoming",
              type: block.type,
              id: block.id,
              title: block.title,
              start: start + 1440,
            };
          }
        }
      }
    }
  }

  if (upcomingCandidate) {
    return upcomingCandidate;
  }

  return { status: "free" };
};

const getDuration = (grouped, id, type, status) => {
  let curIntervals;
  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  for (const block of grouped) {
    const curType = block.type;
    const curId = block.id;

    if (type === curType && curId === id) {
      curIntervals = block.intervals;
      break;
    }
  }

  const isOvernight =
    curIntervals.some((i) => i.end === 1440) &&
    curIntervals.some((i) => i.start === 0);

  let startMinutes, endMinutes;

  if (isOvernight) {
    const beforeMidnight = curIntervals.find((i) => i.end === 1440);
    const afterMidnight = curIntervals.find((i) => i.start === 0);

    startMinutes = beforeMidnight.start;
    endMinutes = afterMidnight.end;
  } else {
    // non-overnight: exactly one interval
    startMinutes = curIntervals[0].start;
    endMinutes = curIntervals[0].end;
  }

  if (status === "ongoing") {
    if (endMinutes === 0) return 1440;
    if (curMinutes <= endMinutes) return endMinutes;
    return 1440 + endMinutes;
  } else if (status === "upcoming") {
    if (startMinutes >= curMinutes) return startMinutes;
    return 1440 + startMinutes;
  }
};

const formatSeconds = (secs) => {
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor(secs / 60 - h * 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const checkOvernight = (rows) => {
  return (
    rows.some((i) => i.end_minutes === 1440) &&
    rows.some((i) => i.start_minutes === 0)
  );
};

const getPrevScheduledStartOffset = (isOvernight, nowMinutes, endMinutes) => {
  if (isOvernight) {
    return nowMinutes >= endMinutes ? 1 : 2;
  } else {
    return nowMinutes >= endMinutes ? 0 : 1;
  }
};

const getHabitDaysAndPrevScheduledDate = async (db, habitId) => {
  let scheduleDays = [];
  let prevScheduledDate = null;

  const rows = await db.getAllAsync(
    `SELECT day, start_minutes, end_minutes FROM habit_schedules WHERE habitId = ?`,
    habitId,
  );

  if (!rows || rows.length === 0) {
    return { scheduleDays: [], prevScheduledDate: null };
  }

  const isOvernight = checkOvernight(rows);

  for (const row of rows) {
    if (isOvernight) {
      if (row.start_minutes !== 0) scheduleDays.push(row.day);
    } else {
      scheduleDays.push(row.day);
    }
  }

  scheduleDays = scheduleDays.sort((a, b) => a - b);

  let endMinutes;

  if (isOvernight) {
    const afterMidnight = rows.find((i) => i.start_minutes === 0);

    endMinutes = afterMidnight.end_minutes;
  } else {
    endMinutes = rows[0].end_minutes;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const offset = getPrevScheduledStartOffset(
    isOvernight,
    nowMinutes,
    endMinutes,
  );

  for (let i = offset; i < offset + 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const day = d.getDay();

    if (scheduleDays.includes(day)) {
      prevScheduledDate = d.toLocaleDateString("sv-SE");
      break;
    }
  }

  return { scheduleDays, prevScheduledDate };
};

const processHabitStreak = (habit, scheduledDate) => {
  if (habit.last_counted_on === scheduledDate) return habit;

  const updated = { ...habit };

  if (habit.last_done_date !== scheduledDate) {
    updated.current_streak = 0;
  } else {
    updated.current_streak += 1;
  }

  updated.best_streak = Math.max(updated.best_streak, updated.current_streak);

  updated.last_counted_on = scheduledDate;
  return updated;
};

const processAllHabits = async (db) => {
  const habits = await db.getAllAsync(`
    SELECT * FROM habits
  `);

  for (const habit of habits) {
    const { scheduledDays, prevScheduledDate } =
      await getHabitDaysAndPrevScheduledDate(db, habit.id);

    if (!prevScheduledDate) continue;

    const updated = processHabitStreak(habit, prevScheduledDate, scheduledDays);

    if (habit === updated) continue; //////

    await db.runAsync(
      `
      UPDATE habits
      SET current_streak = ?, best_streak = ?, last_counted_on = ?
      WHERE id = ?
      `,
      [
        updated.current_streak,
        updated.best_streak,
        updated.last_counted_on,
        habit.id,
      ],
    );
  }
};

const getScheduledDate = async (db, habitId) => {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const rows = await db.getAllAsync(
    `SELECT start_minutes, end_minutes FROM habit_schedules WHERE habitId = ?`,
    habitId,
  );

  if (!rows || rows.length === 0) return null;

  const isOvernight = checkOvernight(rows);
  const scheduledDate = new Date(today);

  if (isOvernight) {
    const beforeMidnight = rows.find((i) => i.end_minutes === 1440);
    if (!beforeMidnight) return null;

    const startMinutes = beforeMidnight.start_minutes;

    if (nowMin < startMinutes) {
      scheduledDate.setDate(scheduledDate.getDate() - 1);
    }
  }

  return scheduledDate.toLocaleDateString("sv-SE");
};

const getLastDoneDate = async (db, habitId) => {
  const rows = await db.getAllAsync(
    `
    SELECT last_done_date
    FROM habits
    WHERE id = ?
    `,
    habitId,
  );

  if (!rows || rows.length === 0) return null;

  return rows[0].last_done_date;
};

const handleHabitStart = async (db, habitId) => {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ duration }] = await db.getAllAsync(
    `SELECT duration FROM habits WHERE id = ?`,
    habitId,
  );

  const rows = await db.getAllAsync(
    `SELECT start_minutes, end_minutes FROM habit_schedules WHERE habitId = ?`,
    habitId,
  );

  if (!rows || rows.length === 0) return;

  const isOvernight = checkOvernight(rows);

  let startMinutes, endMinutes;

  if (isOvernight) {
    const beforeMidnight = rows.find((i) => i.end_minutes === 1440);
    const afterMidnight = rows.find((i) => i.start_minutes === 0);

    startMinutes = beforeMidnight.start_minutes;
    endMinutes = afterMidnight.end_minutes;
  } else {
    startMinutes = rows[0].start_minutes;
    endMinutes = rows[0].end_minutes;
  }

  let update = false;
  const scheduledDate = new Date(today);
  const window = Math.min(
    Math.max(1, Math.floor(duration * START_WINDOW_RATIO)),
    15,
  );

  if (!isOvernight) {
    if (nowMin >= startMinutes && nowMin - startMinutes <= window)
      update = true;
  } else {
    if (startMinutes <= nowMin) {
      if (nowMin - startMinutes <= window) update = true;
    } else {
      scheduledDate.setDate(scheduledDate.getDate() - 1);
      if (1440 + nowMin - startMinutes <= window) update = true;
    }
  }

  if (update) {
    await db.runAsync(
      `
      UPDATE habits
      SET last_done_date = ?
      WHERE id = ?
      `,
      [scheduledDate.toLocaleDateString("sv-SE"), habitId],
    );

    return scheduledDate.toLocaleDateString("sv-SE");
  }
  return null;
};

export default function Dashboard() {
  const db = useSQLiteContext();

  const [currentBlock, setCurrentBlock] = useState({ status: "free" });
  const prevBlockRef = useRef(null);

  const load = useCallback(async () => {
    await processAllHabits(db);

    const blocks = await loadAllBlocks(db);
    const grouped = groupBusyBlocks(blocks);
    const curBlock = getCurrentBlock(grouped);

    const sameBlock =
      prevBlockRef.current &&
      prevBlockRef.current.id === curBlock.id &&
      prevBlockRef.current.type === curBlock.type &&
      prevBlockRef.current.status === curBlock.status;

    const { status, type, id, title } = curBlock;

    // ⏱️ dynamic value → always recompute
    const end = status === "free" ? 0 : getDuration(grouped, id, type, status);

    if (sameBlock) {
      setCurrentBlock((prev) => ({
        ...prev,
        end,
      }));
      return;
    }

    prevBlockRef.current = curBlock;

    let scheduledDate = null;
    let lastDoneDate = null;

    if (type === "habit") {
      scheduledDate = await getScheduledDate(db, id);
      lastDoneDate = await getLastDoneDate(db, id);
    }

    setCurrentBlock({
      status,
      type,
      id,
      title,
      end,
      scheduledDate,
      lastDoneDate,
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let intervalId;
      let timeoutId;
      const run = async () => {
        try {
          await load();
        } catch (err) {
          console.error("Dashboard load error:", err);
        }
      };

      run();
      // sync to next second
      const now = Date.now();
      const delay = 1000 - (now % 1000);

      timeoutId = setTimeout(() => {
        run(); // first exact-second run

        intervalId = setInterval(run, 1000); // every second
      }, delay);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    }, [load]),
  );

  const statusMap = {
    ongoing: { bg: "#5CCF5C20", color: "#2E9B2E", label: "Ongoing" },
    upcoming: { bg: "#5CCF5C20", color: "#9b512eff", label: "Starting in" },
    free: { bg: "#DDD", color: "#555", label: "Free Time" },
  };

  const status = statusMap[currentBlock.status];

  const now = new Date();
  const nowSeconds =
    now.getHours() * 60 * 60 + now.getMinutes() * 60 + now.getSeconds();
  const finalSeconds = currentBlock.end * 60;

  let mainTime = "00:00:00";

  if (currentBlock.status !== "free")
    mainTime = formatSeconds(finalSeconds - nowSeconds);
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        {/* <TouchableOpacity style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog-outline" size={22} color="#444" />
        </TouchableOpacity> */}
      </View>

      <View style={styles.contentWrapper}>
        {/* Quote */}
        {/* <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            “Small progress is still progress.”
          </Text>
        </View> */}

        {/* ----------------------------------------------------
           CARD 1: NEXT EVENT CARD
        ---------------------------------------------------- */}
        <View style={styles.mainEventCard}>
          {/* STATUS */}
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>

          <Text style={styles.mainTime}>{mainTime}</Text>

          <Text style={styles.subText}>
            {currentBlock.status === "free"
              ? "No ongoing event"
              : `${currentBlock.type.toUpperCase()}: ${currentBlock.title}`}
          </Text>

          {/* //////////////////////////ACTION BUTTONS/////////////////////////// */}
          {currentBlock.status === "ongoing" &&
            currentBlock.type === "habit" &&
            currentBlock.scheduledDate !== currentBlock.lastDoneDate && (
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={async () => {
                  const date = await handleHabitStart(db, currentBlock.id);
                  // console.log(date);

                  if (date) {
                    setCurrentBlock((prev) => ({
                      ...prev,
                      lastDoneDate: date,
                    }));
                  }
                }}
              >
                <Text style={styles.btnText}>Start</Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ----------------------------------------------------
   STYLES
---------------------------------------------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  contentWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
  },

  /* HEADER */
  header: {
    height: 60,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  settingsBtn: {
    position: "absolute",
    right: 16,
  },

  /* QUOTE */
  quoteContainer: {
    alignItems: "center",
  },
  quoteText: {
    fontSize: 14,
    color: "#6C63FF",
    fontWeight: "500",
  },

  /* NEXT EVENT CARD */
  mainEventCard: {
    width: 320,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 3,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  mainTime: {
    fontSize: 40,
    fontWeight: "700",
    marginVertical: 8,
    color: "#333",
  },
  subText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontWeight: "600",
    fontSize: 12,
  },

  /* ACTION BUTTONS */
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  doneBtn: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  leaveBtn: {
    backgroundColor: "#FF5555",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rescheduleBtn: {
    backgroundColor: "#888",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  /* FREE TIME CARD */
  freeTimeCard: {
    width: 320,
    backgroundColor: "#F4F2FF",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  freeTimeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6C63FF",
  },
  freeTimeSubtitle: {
    fontSize: 13,
    color: "#555",
    marginTop: 6,
  },
  freeTaskName: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  startNowBtn: {
    marginTop: 14,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  startNowText: {
    color: "white",
    fontWeight: "600",
  },

  /* PROGRESS */
  progressContainer: { width: "100%", alignItems: "center" },
  progressText: { fontSize: 12, color: "#444", marginBottom: 6 },
  progressBarBackground: {
    width: "80%",
    height: 10,
    backgroundColor: "#EDEBFF",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#ff6363ff" },
});
