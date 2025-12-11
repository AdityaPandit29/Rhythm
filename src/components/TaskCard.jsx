import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";

export default function TaskCard({
  id,
  name,
  isMonthly,
  deadline, // 👉 { date: "...", time: "..." }
  priority, // High | Medium | Low
  isAuto, // auto-schedule ON/OFF
  duration, // "1 hr 20 min" OR "0"
  scheduledTime, // 👉 { start: "9:00 AM", end: "10:30 AM" }
  recommendedTime, // 👉 "4:30 PM" (only when duration=0)
  onReschedule,
  onDone,
}) {
  const navigation = useNavigation();

  const priorityColors = {
    High: "#FF5555",
    Medium: "#F7B801",
    Low: "#4CAF50",
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
                taskName: name,
                isMonthly: isMonthly,
                priority: priority,
                isAuto: isAuto,
                // startTime: scheduledTime.start,
                // endTime: scheduledTime.end,
              },
            })
          }
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#6C63FF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          // 👉 onPress: delete task logic
        >
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

        {isMonthly && <Text style={styles.monthlyBadge}>Monthly</Text>}
        {isAuto && <Text style={styles.monthlyBadge}>Auto</Text>}
      </View>

      {/* DEADLINE if isAuto === true */}
      {isAuto && (
        <Text style={styles.subText}>
          Due: {deadline?.date} at {deadline?.time}
        </Text>
      )}

      {/* SCHEDULE AND DURATION */}
      {duration === "0" ? (
        <>
          <Text style={styles.schedule}>
            Can be done at <Text style={styles.bold}>{recommendedTime}</Text>
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.schedule}>
            Scheduled : {scheduledTime?.start} - {scheduledTime?.end}
          </Text>
          <View style={styles.durationRow}>
            <Entypo name="stopwatch" size={16} color="#555" />
            <Text style={styles.durationText}>Duration: {duration}</Text>
          </View>
        </>
      )}

      {/* BUTTONS */}
      <View style={styles.btnRow}>
        {isAuto && (
          <TouchableOpacity style={styles.rescheduleBtn} onPress={onReschedule}>
            <Text style={styles.rescheduleText}>Reschedule</Text>
          </TouchableOpacity>
        )}
      </View>
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
