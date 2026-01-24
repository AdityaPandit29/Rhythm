import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { groupBusyBlocks } from "../utils/scheduling.js";
import { useSQLiteContext } from "expo-sqlite";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

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

export default function Dashboard() {
  const db = useSQLiteContext();

  // const [blocks, setBlocks] = useState([]);
  const [currentBlock, setCurrentBlock] = useState({ status: "free" });

  const load = useCallback(async () => {
    const blocks = await loadAllBlocks(db);
    const grouped = groupBusyBlocks(blocks);
    const curBlock = getCurrentBlock(grouped);

    const { status, type, id, title } = curBlock;
    if (status === "free")
      setCurrentBlock({ status, type, id, title, duration: 0 });
    else {
      const duration = getDuration(grouped, id, type, status);
      setCurrentBlock({ status, type, id, title, duration });
    }
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
  const finalSeconds = currentBlock.duration * 60;

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

          {/* ACTION BUTTONS */}
          {/* {currentBlock.status === "ongoing" && (
            <TouchableOpacity style={styles.doneBtn}>
              <Text style={styles.btnText}>Mark Done</Text>
            </TouchableOpacity>
          )} */}
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
