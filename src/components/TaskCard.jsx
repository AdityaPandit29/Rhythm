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
  deadline,
  startTimes,
  endTimes,
  scheduledDates,
  durations,
  totalDuration,
  durationLeft,
  onDeleted,
}) {
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const deadlineDate = new Date(deadline);
  const startTime = new Date(startTimes[0]);
  const endTime = new Date(endTimes[0]);

  const priorityColors = {
    High: "#FF5555",
    Medium: "#F7B801",
    Low: "#4CAF50",
  };

  const formatRelativeDeadline = (isoDate) => {
    if (!isoDate) return "";

    const date = new Date(isoDate);

    // Normalize dates (ignore time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    let dayLabel;

    if (diffDays === 0) {
      dayLabel = "Today";
    } else if (diffDays === 1) {
      dayLabel = "Tomorrow";
    } else if (diffDays === -1) {
      dayLabel = "Yesterday";
    } else {
      dayLabel = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dayLabel} at ${time}`;
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
                deadline: deadlineDate,
                durationLeft: durationLeft, // used for selected Hours and Minutes
                startTime: startTime,
                endTime: endTime,
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

        {isAuto === 1 && <Text style={styles.monthlyBadge}>Auto</Text>}
        {totalDuration && totalDuration === 0 && (
          <Text style={styles.monthlyBadge}>Quick</Text>
        )}
      </View>

      {/* DEADLINE */}
      <Text style={styles.subText}>
        Due : {`${formatRelativeDeadline(deadlineDate)}`}
      </Text>

      {/* SCHEDULE AND DURATION */}
      <Text style={styles.schedule}>
        Scheduled :{" "}
        {startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}{" "}
        -{" "}
        {endTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </Text>
      {isAuto === 1 && (
        <View style={styles.durationRow}>
          <Entypo name="stopwatch" size={16} color="#555" />
          <Text style={styles.durationText}>Duration: {durations[0]}</Text>
        </View>
      )}

      {/* BUTTONS */}
      {isAuto === 1 && (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.rescheduleBtn} onPress={onReschedule}>
            <Text style={styles.rescheduleText}>Reschedule</Text>
          </TouchableOpacity>
        </View>
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
