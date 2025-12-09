import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";

export default function TaskCard({
  id,
  name,
  due,
  isMonthly,
  priority,
  duration,
  isAutomatic,
  startTime,
  endTime,
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
      {/* TOP RIGHT ICONS */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("EditTask")}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#6C63FF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <MaterialCommunityIcons name="delete" size={20} color="#D9534F" />
        </TouchableOpacity>
      </View>

      {/* TITLE */}
      <Text style={styles.title}>{name}</Text>

      {/* META INFO */}
      <View>
        <Text style={styles.subText}>
          {isMonthly ? "Monthly Task" : `Due: ${due}`} • Priority: {priority}
        </Text>
        <Text style={styles.subText}>
          Scheduled: {startTime} - {endTime}
        </Text>
      </View>
      {/* DURATION */}
      <View style={styles.durationRow}>
        <Entypo name="stopwatch" size={16} color="#555" />
        <Text style={styles.durationText}>Duration: {duration}</Text>
      </View>

      {/* BUTTONS */}
      <View style={styles.btnRow}>
        {isAutomatic && (
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
    width: 40,
    height: 40,
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

  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },

  durationText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#444",
  },

  taskSchedule: {
    marginTop: 6,
    fontSize: 14,
    color: "#555",
  },

  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
