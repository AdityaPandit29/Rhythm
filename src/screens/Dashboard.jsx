import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { groupBusyBlocks } from "../utils/scheduling.js";
import { useSQLiteContext } from "expo-sqlite";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";
import { quotes } from "../utils/quotes.js";
import { computeAuthority } from "../utils/scheduling.js";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { rescheduleAllNotifications } from "../utils/notify.js";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
const START_WINDOW_RATIO = 0.3; // 20% of duration
const MAX_LATE = 20;

const loadAllBlocksExceptQuickTasks = async (db) => {
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

const getHabitInfo = async (db, habitId) => {
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
  let startMinutes;

  if (isOvernight) {
    const beforeMidnight = rows.find((i) => i.end_minutes === 1440);
    if (!beforeMidnight) return null;

    startMinutes = beforeMidnight.start_minutes;

    if (nowMin < startMinutes) {
      scheduledDate.setDate(scheduledDate.getDate() - 1);
    }
  } else {
    startMinutes = rows[0].start_minutes;
  }

  return {
    habitScheduledDate: scheduledDate.toLocaleDateString("sv-SE"),
    habitStartMinutes: startMinutes,
    isHabitOvernight: isOvernight,
  };
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

const isHabitStartWindowexpired = async (
  db,
  habitId,
  startMinutes,
  isOvernight,
) => {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ duration }] = await db.getAllAsync(
    `SELECT duration FROM habits WHERE id = ?`,
    habitId,
  );

  // const rows = await db.getAllAsync(
  //   `SELECT start_minutes, end_minutes FROM habit_schedules WHERE habitId = ?`,
  //   habitId,
  // );

  // if (!rows || rows.length === 0) return;

  // const isOvernight = checkOvernight(rows);

  // let startMinutes;

  // if (isOvernight) {
  //   const beforeMidnight = rows.find((i) => i.end_minutes === 1440);

  //   startMinutes = beforeMidnight.start_minutes;
  // } else {
  //   startMinutes = rows[0].start_minutes;
  // }

  let isLate = true;
  // const scheduledDate = new Date(today);
  const window = Math.min(
    Math.max(1, Math.floor(duration * START_WINDOW_RATIO)),
    MAX_LATE,
  );

  if (!isOvernight) {
    if (nowMin >= startMinutes && nowMin - startMinutes <= window)
      isLate = false;
  } else {
    if (startMinutes <= nowMin) {
      if (nowMin - startMinutes <= window) isLate = false;
    } else {
      // scheduledDate.setDate(scheduledDate.getDate() - 1);
      if (1440 + nowMin - startMinutes <= window) isLate = false;
    }
  }

  return isLate;
};

const handleHabitStart = async (db, habitId, scheduledDate) => {
  // const now = new Date();
  // const nowMin = now.getHours() * 60 + now.getMinutes();
  // let today = new Date();
  // today.setHours(0, 0, 0, 0);

  // const [{ duration }] = await db.getAllAsync(
  //   `SELECT duration FROM habits WHERE id = ?`,
  //   habitId,
  // );

  // const rows = await db.getAllAsync(
  //   `SELECT start_minutes, end_minutes FROM habit_schedules WHERE habitId = ?`,
  //   habitId,
  // );

  // if (!rows || rows.length === 0) return;

  // const isOvernight = checkOvernight(rows);

  // let startMinutes;

  // if (isOvernight) {
  //   const beforeMidnight = rows.find((i) => i.end_minutes === 1440);

  //   startMinutes = beforeMidnight.start_minutes;
  // } else {
  //   startMinutes = rows[0].start_minutes;
  // }

  // let update = false;
  // const scheduledDate = new Date(today);
  // const window = Math.min(
  //   Math.max(1, Math.floor(duration * START_WINDOW_RATIO)),
  //   MAX_LATE,
  // );

  // if (!isOvernight) {
  //   if (nowMin >= startMinutes && nowMin - startMinutes <= window)
  //     update = true;
  // } else {
  //   if (startMinutes <= nowMin) {
  //     if (nowMin - startMinutes <= window) update = true;
  //   } else {
  //     scheduledDate.setDate(scheduledDate.getDate() - 1);
  //     if (1440 + nowMin - startMinutes <= window) update = true;
  //   }
  // }

  // const isLate = await isHabitStartWindowexpired(db, habitId);
  // if (!isLate) {
  try {
    await db.runAsync(
      `
      UPDATE habits
      SET last_done_date = ?
      WHERE id = ?
      `,
      [scheduledDate, habitId],
    );
  } catch (error) {
    console.error(error);
  }
  return scheduledDate;
  // }
  // return null;
};

const handleTaskCompletion = async (db, taskId) => {
  try {
    // Delete dependent schedules first (correct order)
    await db.runAsync(`DELETE FROM task_schedules WHERE taskId = ?`, [taskId]);

    // Delete the task itself
    await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  } catch (err) {
    console.error("Completion error:", err);
    Alert.alert("Error", "Failed to complete task.");
  }
};

const getQuickTasks = async (db) => {
  const rows = await db.getAllAsync(`
    SELECT id, title, deadline_date, deadline_minutes, priority
    FROM tasks
    WHERE is_auto = 1 AND total_duration = 0;
  `);

  if (!rows || rows.length === 0) return [];

  const quickTasks = rows.map((row) => {
    const authority = computeAuthority({
      priority: row.priority,
      deadlineDate: row.deadline_date,
      deadlineMinutes: row.deadline_minutes,
      duration: 0,
    });

    return {
      id: row.id,
      title: row.title,
      deadline_date: row.deadline_date,
      deadline_minutes: row.deadline_minutes,
      priority: row.priority,
      authority,
    };
  });

  // sort by authority (descending)
  quickTasks.sort((a, b) => b.authority - a.authority);

  // return top 5
  return quickTasks.slice(0, 5);
};

function useNotificationBootstrap(db) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!db || ranRef.current) return;

    ranRef.current = true;
    let cancelled = false;

    const init = async () => {
      // 1️⃣ Permissions
      let { status } = await Notifications.getPermissionsAsync();

      if (status !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }

      if (status !== "granted") {
        console.warn("Notifications permission not granted");
        return;
      }

      // 2️⃣ Android channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      // 3️⃣ Schedule notifications
      if (!cancelled) {
        console.log("Before notification scheduling");
        await rescheduleAllNotifications(db);
        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();

        console.log("📅 Scheduled notifications:", scheduled.length);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [db]);

  return null;
}

export default function Dashboard() {
  const db = useSQLiteContext();
  useNotificationBootstrap(db);

  const [quickTasks, setQuickTasks] = useState([]);
  const [currentBlock, setCurrentBlock] = useState({ status: "free" });
  const [quote, setQuote] = useState("");
  const prevBlockRef = useRef(null);

  const load = useCallback(async () => {
    await processAllHabits(db);

    const blocks = await loadAllBlocksExceptQuickTasks(db);
    const grouped = groupBusyBlocks(blocks);
    const curBlock = getCurrentBlock(grouped);

    const sameBlock =
      prevBlockRef.current &&
      prevBlockRef.current.id === curBlock.id &&
      prevBlockRef.current.type === curBlock.type &&
      prevBlockRef.current.status === curBlock.status;

    const { status, type, id, title } = curBlock;

    // ⏱️ dynamic value → always recompute
    let end;
    if (status === "free") {
      const quickTasks = await getQuickTasks(db);
      setQuickTasks(quickTasks);
      end = 0;
    } else end = getDuration(grouped, id, type, status);

    if (sameBlock) {
      setCurrentBlock((prev) => ({
        ...prev,
        end,
      }));
      return;
    }

    prevBlockRef.current = curBlock;

    let scheduledDate = null,
      isLate = null;
    let lastDoneDate = null;

    if (type === "habit") {
      const { habitScheduledDate, habitStartMinutes, isHabitOvernight } =
        await getHabitInfo(db, id);
      scheduledDate = habitScheduledDate;
      lastDoneDate = await getLastDoneDate(db, id);
      isLate = await isHabitStartWindowexpired(
        db,
        id,
        habitStartMinutes,
        isHabitOvernight,
      );
    }

    setCurrentBlock({
      status,
      type,
      id,
      title,
      end,
      scheduledDate,
      lastDoneDate,
      isLate,
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

  useEffect(() => {
    // useNotificationBootstrap(db);
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  const statusMap = {
    ongoing: { bg: "#5CCF5C20", color: "#2E9B2E", label: "Ongoing" },
    upcoming: { bg: "#FFF4D6", color: "#7A4D00", label: "Starting in" },
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
      </View>

      <View style={styles.contentWrapper}>
        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>“{quote[0]}”</Text>

          {quote[1] && (
            <View style={styles.authorWrapper}>
              <Text style={styles.quoteAuthor}>— {quote[1]} </Text>
            </View>
          )}
        </View>

        {/* ----------------------------------------------------
           CARD 1: NEXT EVENT CARD
        ---------------------------------------------------- */}
        {currentBlock.status === "free" && quickTasks.length !== 0 ? (
          <View style={styles.quickTaskContainer}>
            <Text style={styles.quickTitle}>
              Quick tasks you can finish now
            </Text>

            {quickTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.quickTaskCard}
                onPress={() => {
                  Alert.alert(
                    "Complete Task",
                    "Are you sure you want to mark this task as done?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Done",
                        style: "destructive",
                        onPress: async () => {
                          await handleTaskCompletion(db, task.id);
                          load(); // refresh UI
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={styles.quickTaskText}>{task.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
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
            {/* {console.log(currentBlock.isLate + " " + currentBlock.isLate)} */}

            {/* //////////////////////////ACTION BUTTONS/////////////////////////// */}
            {currentBlock.status === "ongoing" &&
              currentBlock.type === "habit" &&
              currentBlock.scheduledDate !== currentBlock.lastDoneDate &&
              (currentBlock.isLate === false ? (
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={async () => {
                    const date = await handleHabitStart(
                      db,
                      currentBlock.id,
                      currentBlock.scheduledDate,
                    );

                    if (date) {
                      setCurrentBlock((prev) => ({
                        ...prev,
                        lastDoneDate: date,
                      }));
                    }
                  }}
                >
                  {/* <View style={styles.startButton}> */}
                  <Text style={styles.startButtonText}>Start</Text>
                  {/* </View> */}
                </TouchableOpacity>
              ) : (
                <Text style={styles.lateText}>
                  You're late! {"\n"}
                  Being on time helps protect your streak.
                </Text>
              ))}

            {currentBlock.status === "ongoing" &&
              currentBlock.type === "task" && (
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => {
                    Alert.alert(
                      "Complete Task",
                      "Are you sure you want to mark this task as done?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Done",
                          style: "destructive",
                          onPress: async () => {
                            await handleTaskCompletion(db, currentBlock.id);
                            load(); // refresh UI
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.startButtonText}>Done</Text>
                </TouchableOpacity>
              )}
          </View>
        )}
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

  quoteCard: {
    width: "90%",
    backgroundColor: "#F5F4FF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignSelf: "center",
  },

  authorWrapper: {
    width: "100%", // ← key
    alignItems: "flex-end", // right align without clipping
    marginTop: 6,
  },

  quoteAuthor: {
    fontSize: 12,
    color: "#777",
    fontStyle: "italic",
    includeFontPadding: false,
    letterSpacing: 0.3,
  },

  quoteMark: {
    fontSize: 28,
    color: "#6C63FF",
    lineHeight: 28,
    marginBottom: -6,
  },

  quoteText: {
    fontSize: 14,
    color: "#4A46A3",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },

  quickTaskContainer: {
    marginTop: 16,
  },

  quickTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },

  quickTaskCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
    marginBottom: 8,
  },

  quickTaskText: {
    fontSize: 14,
    color: "#222",
  },

  lateText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",

    color: "#7A4D00", // dark amber text
    backgroundColor: "#FFF4D6", // light amber bg
    borderWidth: 1,
    borderColor: "#FFD48A",

    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: "hidden",
  },

  startButton: {
    marginTop: 24,
    paddingHorizontal: 24,

    backgroundColor: "#10B981", // emerald green (success/action)
    borderRadius: 12,

    minHeight: 40, // 48px+ touch target
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3, // Android shadow
  },
  startButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
