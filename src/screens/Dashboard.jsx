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
      r.start_minutes AS start_minutes,
      r.end_minutes AS end_minutes,
      d.day AS day,
      'routine' AS type,
      r.id AS itemId,
      r.title AS title
    FROM routines r
    LEFT JOIN routine_days d ON r.id = d.routineId

    UNION ALL

    SELECT
      h.start_minutes AS start_minutes,
      h.end_minutes AS end_minutes,
      hd.day AS day,
      'habit' AS type,
      h.id AS itemId,
      h.title AS title
    FROM habits h
    LEFT JOIN habit_days hd ON h.id = hd.habitId
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
    WHERE (is_auto == 1 AND t.total_duration != 0) OR (is_auto == 0);
  `);

  return { recurring, tasks };
};

const isTimeInRange = (nowMin, start, end) => {
  // normal (same day)
  if (start <= end) {
    return nowMin >= start && nowMin < end;
  }

  // overnight (e.g. 1300 → 500)
  return nowMin >= start || nowMin < end;
};

const getCurrentBlock = (blocks) => {
  const now = new Date();
  const todayKey = now.toLocaleDateString("sv-SE");
  const todayDayIndex = now.getDay(); // 0–6
  const yesterdayDayIndex = (todayDayIndex + 6) % 7;
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  let closestUpcoming = null;

  for (const block of blocks) {
    // =============================
    // HABITS & ROUTINES (recurring)
    // =============================
    if (block.type !== "task") {
      const start = block.start_minutes;
      const end = block.end_minutes;

      const isOvernight = end < start;

      const todayAllowed =
        block.days.includes(todayDayIndex) ||
        (isOvernight && block.days.includes(yesterdayDayIndex));

      if (!todayAllowed) continue;

      // Normalize timeline
      const adjustedEnd = isOvernight ? end + 1440 : end;
      const adjustedNow =
        minutesNow < start && isOvernight ? minutesNow + 1440 : minutesNow;

      // ONGOING
      if (adjustedNow >= start && adjustedNow < adjustedEnd) {
        return {
          status: "ongoing",
          type: block.type,
          title: block.title,
          start_minutes: start,
          end_minutes: adjustedEnd % 1440,
        };
      }

      // UPCOMING (only if start is ahead)
      const diff = start - minutesNow;
      if (diff > 0 && diff <= 10 && block.days.includes(todayDayIndex)) {
        if (!closestUpcoming || diff < closestUpcoming.diff) {
          closestUpcoming = {
            status: "upcoming",
            type: block.type,
            title: block.title,
            start_minutes: start,
            diff,
          };
        }
      }
    }

    // =============================
    // TASKS (date-based, already split)
    // =============================
    else {
      block.dates.forEach((date, i) => {
        if (date !== todayKey) return;

        const start = block.start_minutes[i];
        const end = block.end_minutes[i];

        // ONGOING
        if (minutesNow >= start && minutesNow < end) {
          let mergedStart = start;
          let mergedEnd = end;

          // check yesterday continuation
          const yesterdayKey = new Date(
            Date.now() - 24 * 60 * 60 * 1000
          ).toLocaleDateString("sv-SE");

          block.dates.forEach((d, j) => {
            if (
              d === yesterdayKey &&
              block.end_minutes[j] === 1440 && // ended at midnight
              start === 0 // today's part starts at midnight
            ) {
              mergedStart = block.start_minutes[j];
              mergedEnd = end + 1440; // logical full span
            }
          });

          closestUpcoming = {
            status: "ongoing",
            type: "task",
            title: block.title,
            start_minutes: mergedStart,
            end_minutes: mergedEnd % 1440,
          };
        }

        // UPCOMING
        const diff = start - minutesNow;
        if (diff > 0 && diff <= 10) {
          if (!closestUpcoming || diff < closestUpcoming.diff) {
            closestUpcoming = {
              status: "upcoming",
              type: "task",
              title: block.title,
              start_minutes: start,
              diff,
            };
          }
        }
      });

      if (closestUpcoming?.status === "ongoing") return closestUpcoming;
    }
  }

  // console.log("closestUpcoming : ", closestUpcoming);

  return closestUpcoming || { status: "free" };
};

const formatMinutes = (mins) => {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
};

export default function Dashboard() {
  const db = useSQLiteContext();

  const [blocks, setBlocks] = useState([]);
  const [currentBlock, setCurrentBlock] = useState(null);

  const load = useCallback(async () => {
    const { recurring, tasks } = await loadAllBlocks(db);
    const grouped = groupBusyBlocks(recurring, tasks);
    // console.log("currentBlock : ", getCurrentBlock(grouped));
    // console.log("grouped : ", grouped);

    setBlocks(grouped);
    setCurrentBlock(getCurrentBlock(grouped));
    // console.log("currentBlock : ", currentBlock);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const run = async () => {
        try {
          if (!cancelled) await load();
        } catch (err) {
          console.error("Dashboard load error:", err);
        }
      };

      run(); // refresh immediately on navigate/focus [web:41]

      const interval = setInterval(run, 60 * 1000); // refresh every minute while focused [web:41]

      return () => {
        cancelled = true;
        clearInterval(interval); // cleanup happens on blur/unmount [web:41]
      };
    }, [load])
  );

  const block = currentBlock ?? { status: "free" };

  // console.log("currentBlock : ", currentBlock);
  // console.log("block : ", block);

  const statusMap = {
    ongoing: { bg: "#5CCF5C20", color: "#2E9B2E", label: "Ongoing" },
    upcoming: { bg: "#5CCF5C20", color: "#9b512eff", label: "Starting in" },
    free: { bg: "#DDD", color: "#555", label: "Free Time" },
  };

  const status = statusMap[block.status] || statusMap.free;

  let mainTime = "00:00";

  if (block.status === "ongoing") {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const remaining =
      block.end_minutes >= block.start_minutes
        ? block.end_minutes - nowMin
        : 1440 - nowMin + block.end_minutes;

    mainTime = formatMinutes(Math.max(0, remaining));
  }

  if (block.status === "upcoming") {
    mainTime = `${block.diff} min`;
  }

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
            {block.status === "free"
              ? "No ongoing event"
              : `${block.type.toUpperCase()}: ${block.title}`}
          </Text>

          {/* ACTION BUTTONS */}
          {/* {block.status === "ongoing" && (
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
