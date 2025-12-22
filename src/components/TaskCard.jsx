import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";

export default function TaskCard({
  id,
  name,
  priority,
  isAuto,
  deadlineDate,
  deadlineMinutes,
  startMinutes,
  endMinutes,
  scheduledDates,
  totalDuration,
  durationLeft,
  onDeleted,
}) {
  const navigation = useNavigation();
  const db = useSQLiteContext();

  // ✅ Convert minutes to AM/PM time
  function minutesToTimeAMPM(minutes) {
    let hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")} ${ampm}`;
  }

  // ✅ Relative date formatting
  function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // ✅ Format deadline (sv-SE + relative + time)
  const formatRelativeDeadline = (svSeDate, deadlineMins) => {
    if (!svSeDate) return "";

    const [year, month, day] = svSeDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    let dayLabel;
    if (diffDays === 0) dayLabel = "Today";
    else if (diffDays === 1) dayLabel = "Tomorrow";
    else if (diffDays === -1) dayLabel = "Yesterday";
    else
      dayLabel = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    // ✅ FIXED: Always show time if deadlineMins exists
    const time =
      deadlineMins !== undefined && deadlineMins !== null
        ? minutesToTimeAMPM(deadlineMins)
        : "";

    return time ? `${dayLabel} at ${time}` : dayLabel;
  };

  const priorityColors = {
    High: "#FF5555",
    Low: "#4CAF50",
  };

  const handleDelete = () => {
    Alert.alert("Delete Task", `Are you sure you want to delete "${name}"?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await db.runAsync(`DELETE FROM task_schedules WHERE taskId = ?`, [
              id,
            ]);
            await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
            if (onDeleted) {
              onDeleted();
            }
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete task.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.taskCard}>
      {/* RIGHT TOP ICONS */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            navigation.navigate("EditTask", {
              mode: "edit",
              task: {
                id: id,
                taskName: name,
                priority: priority,
                isAuto: isAuto,
                deadlineDate: deadlineDate,
                deadlineMinutes: deadlineMinutes,
                scheduledDate: scheduledDates[0],
                durationLeft: durationLeft,
                startMinutes: startMinutes[0],
                endMinutes: endMinutes[0],
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

      {/* CONDITION 1: Manual Task (isAuto === 0) */}
      {isAuto === 0 && (
        <>
          <Text style={styles.schedule}>
            {formatRelativeDate(scheduledDates[0])}
          </Text>
          <Text style={styles.schedule}>
            {minutesToTimeAMPM(startMinutes[0])} -{" "}
            {minutesToTimeAMPM(endMinutes[0])}
          </Text>
        </>
      )}

      {/* CONDITION 2: Auto Task with Duration (isAuto === 1 && totalDuration > 0) */}
      {isAuto === 1 && totalDuration > 0 && (
        <>
          {/* META ROW: PRIORITY + TYPE */}
          <View style={styles.metaRow}>
            <View style={styles.priorityRow}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColors[priority] },
                ]}
              />
              <Text style={styles.priorityText}>{priority} Priority</Text>
            </View>
            <Text style={styles.monthlyBadge}>Auto</Text>
          </View>

          {/* DEADLINE */}
          <Text style={styles.subText}>
            Due: {formatRelativeDeadline(deadlineDate, deadlineMinutes)}
          </Text>

          {/* SCHEDULE AND DURATION */}
          <Text style={styles.schedule}>
            {formatRelativeDate(scheduledDates[0])}
          </Text>
          <Text style={styles.schedule}>
            {minutesToTimeAMPM(startMinutes[0])} -{" "}
            {minutesToTimeAMPM(endMinutes[0])}
          </Text>
          <View style={styles.durationRow}>
            <Entypo name="stopwatch" size={16} color="#555" />
            <Text style={styles.durationText}>
              Duration: {endMinutes[0] - startMinutes[0]}min
            </Text>
          </View>
        </>
      )}

      {/* CONDITION 3: Quick Auto Task (isAuto === 1 && totalDuration === 0) */}
      {isAuto === 1 && totalDuration === 0 && (
        <>
          <View style={styles.metaRow}>
            <View style={styles.priorityRow}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColors[priority] },
                ]}
              />
              <Text style={styles.priorityText}>{priority} Priority</Text>
            </View>
            <Text style={styles.monthlyBadge}>Auto</Text>
            <Text style={styles.monthlyBadge}>Quick</Text>
          </View>
          <Text style={styles.subText}>
            Due: {formatRelativeDeadline(deadlineDate, deadlineMinutes)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
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
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  monthlyBadge: {
    backgroundColor: "#F7F7FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    color: "#444",
    fontWeight: "600",
  },
  subText: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },
  schedule: {
    fontSize: 14,
    fontWeight: "500",
    color: "#444",
    marginTop: 6,
  },
  bold: {
    fontWeight: "700",
    color: "#333",
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
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
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
