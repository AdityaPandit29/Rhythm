import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";

export default function Dashboard() {
  /* ----------------------------------------------------
     Dummy Event + Free Time Example
  ---------------------------------------------------- */
  const now = new Date();
  const nextEventTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hrs later

  const [event, setEvent] = useState({
    title: "Math Assignment",
    type: "task", // habit | routine | task
    startTime: nextEventTime,
    endTime: new Date(nextEventTime.getTime() + 60 * 60 * 1000),
    duration: 60,
    status: "upcoming",
  });

  /* A zero-duration task for free-time suggestions */
  const zeroDurationTask = {
    title: "Email Cleanup",
    duration: 0,
  };

  const [timer, setTimer] = useState("00:00:00");

  /* ----------------------------------------------------
     TIMER LOGIC → Runs every second
  ---------------------------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => updateTimer(), 1000);
    return () => clearInterval(interval);
  }, [event]);

  const updateTimer = () => {
    const now = new Date();

    if (now < event.startTime) {
      // UPCOMING EVENT
      setEvent((e) => ({ ...e, status: "upcoming" }));
      setTimer(formatTime(event.startTime - now));
    } else if (now >= event.startTime && now <= event.endTime) {
      // ONGOING
      setEvent((e) => ({ ...e, status: "ongoing" }));
      setTimer(formatTime(event.endTime - now));
    } else {
      // OVERTIME
      setEvent((e) => ({ ...e, status: "overtime" }));
      setTimer(formatTime(now - event.endTime));
    }
  };

  const formatTime = (ms) => {
    const sec = Math.floor(ms / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  /* ----------------------------------------------------
     STATUS COLORS + LABELS
  ---------------------------------------------------- */
  const getStatusStyle = () => {
    switch (event.status) {
      case "upcoming":
        return { bg: "#5CCF5C20", color: "#2E9B2E", label: "Upcoming" };
      case "ongoing":
        return { bg: "#3498db20", color: "#2980b9", label: "Ongoing" };
      case "overtime":
        return { bg: "#FF555520", color: "#FF5555", label: "Overtime" };
      default:
        return { bg: "#DDD", color: "#333", label: "Unknown" };
    }
  };
  const status = getStatusStyle();

  /* ----------------------------------------------------
     CHECK IF USER HAS FREE TIME
  ---------------------------------------------------- */
  const timeUntilNextEvent = event.startTime - now;
  const hasFreeTime = timeUntilNextEvent > 45 * 60 * 1000; // >45min gap

  const showFreeTimeCard =
    hasFreeTime && zeroDurationTask && zeroDurationTask.duration === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog-outline" size={22} color="#444" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrapper}>
        {/* Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            “Small progress is still progress.”
          </Text>
        </View>

        {/* ----------------------------------------------------
           CARD 1: NEXT EVENT CARD
        ---------------------------------------------------- */}
        <View style={styles.mainEventCard}>
          <Text style={styles.cardTitle}>Next Event</Text>

          {/* TIMER */}
          <Text style={styles.mainTime}>{timer}</Text>

          {/* EVENT NAME + TYPE */}
          <Text style={styles.subText}>
            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}:{" "}
            {event.title}
          </Text>

          {/* STATUS */}
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.doneBtn}>
              <Text style={styles.btnText}>Done</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.leaveBtn}>
              <Text style={styles.btnText}>Leave</Text>
            </TouchableOpacity>

            {event.type === "task" && (
              <TouchableOpacity style={styles.rescheduleBtn}>
                <Text style={styles.btnText}>Reschedule</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ----------------------------------------------------
           CARD 2: FREE TIME CARD
        ---------------------------------------------------- */}
        {showFreeTimeCard && (
          <View style={styles.freeTimeCard}>
            <Text style={styles.freeTimeTitle}>Free Time Available</Text>

            <Text style={styles.freeTimeSubtitle}>
              You can complete this quick task now:
            </Text>

            <Text style={styles.freeTaskName}>• {zeroDurationTask.title}</Text>

            <TouchableOpacity style={styles.startNowBtn}>
              <Text style={styles.startNowText}>Start Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TODAY SCORE */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Today’s Score: 64%</Text>

          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: "64%" }]} />
          </View>
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
    marginTop: 12,
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
