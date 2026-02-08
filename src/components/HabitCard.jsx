import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { rescheduleNotificationsIfAllowed } from "../utils/notify.js";

export default function HabitCard({
  id,
  name,
  intervals,
  bestStreak,
  currentStreak,
  onDeleted,
}) {
  const navigation = useNavigation();
  const db = useSQLiteContext();

  const isOvernight =
    intervals.some((i) => i.end === 1440) &&
    intervals.some((i) => i.start === 0);

  let startMinutes, endMinutes;

  if (isOvernight) {
    const beforeMidnight = intervals.find((i) => i.end === 1440);
    const afterMidnight = intervals.find((i) => i.start === 0);

    startMinutes = beforeMidnight.start;
    endMinutes = afterMidnight.end;
  } else {
    // non-overnight: exactly one interval
    startMinutes = intervals[0].start;
    endMinutes = intervals[0].end;
  }

  // daysSelected: number[] (0 = Sun ... 6 = Sat)
  const daysSelected = isOvernight
    ? [
        ...new Set(
          intervals
            .filter((i) => i.start !== 0) // drop carry-over day
            .map((i) => i.day),
        ),
      ]
    : [...new Set(intervals.map((i) => i.day))];

  const booleanDays = Array(7).fill(false);

  daysSelected.forEach((day) => {
    booleanDays[day] = true;
  });

  const handleDelete = () => {
    Alert.alert("Delete Habit", `Are you sure you want to delete "${name}"?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await db.runAsync(`DELETE FROM habit_schedules WHERE habitId = ?`, [
              id,
            ]);
            await db.runAsync(`DELETE FROM habits WHERE id = ?`, [id]);

            // Trigger refresh in parent
            if (onDeleted) {
              onDeleted();
            }
            await rescheduleNotificationsIfAllowed(db);
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete habit.");
          }
        },
      },
    ]);
  };

  function minutesToTimeAMPM(minutes) {
    let hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // 0 → 12, 13 → 1
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")} ${ampm}`;
  }

  const startTime = minutesToTimeAMPM(startMinutes);
  const endTime = minutesToTimeAMPM(endMinutes);

  return (
    <View style={styles.card}>
      {/* TOP RIGHT ICONS */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            navigation.navigate("EditHabit", {
              mode: "edit",
              habit: {
                id: id,
                habitName: name,
                startMinutes: startMinutes,
                endMinutes: endMinutes,
                days: booleanDays,
              },
            })
          }
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#6C63FF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
          <MaterialCommunityIcons name="delete" size={20} color="#D9534F" />
        </TouchableOpacity>
      </View>

      {/* TITLE */}
      <Text style={styles.title}>{name}</Text>

      {/* TIME */}
      <Text style={styles.schedule}>
        {startTime} - {endTime}
      </Text>

      {/* WEEKDAY */}
      <View style={styles.daysRow}>
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <View
            key={index}
            style={[
              styles.dayBubbleSmall,
              !booleanDays[(index + 1) % 7] && { backgroundColor: "#EFEFFF" },
            ]}
          >
            <Text
              style={[
                styles.dayTextSmall,
                !booleanDays[(index + 1) % 7] && { color: "#444" },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>
      {/* STREAKS */}
      <View style={styles.streakRow}>
        <View style={styles.streakBox}>
          <MaterialCommunityIcons
            name="fire"
            size={20}
            color="#FF6B35"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.streakText}>Current: {currentStreak} days</Text>
        </View>

        <View style={styles.streakBox}>
          <MaterialCommunityIcons
            name="trophy"
            size={20}
            color="#F7B801"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.streakText}>Best: {bestStreak} days</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,

    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },

    position: "relative",
  },

  iconRow: {
    position: "absolute",
    right: 12,
    top: 12,
    flexDirection: "row",
    zIndex: 10,
  },

  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F4F4F5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    paddingRight: 70,
    marginBottom: 10,
  },

  subText: {
    fontSize: 13,
    color: "#777",
  },

  schedule: {
    fontSize: 14,
    fontWeight: "500",
    color: "#444",
    marginTop: 6,
  },

  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  durationText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#444",
  },

  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },

  dayBubbleSmall: {
    height: 24,
    width: 24,
    backgroundColor: "#6C63FF",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  dayTextSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },

  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 20,
  },

  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  streakText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },

  rescheduleBtn: {
    borderWidth: 1.2,
    borderColor: "#6C63FF",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  rescheduleText: {
    color: "#6C63FF",
    fontWeight: "600",
    fontSize: 13,
  },
});
