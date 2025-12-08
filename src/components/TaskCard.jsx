import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

export default function TaskCard({
  id,
  name,
  due,
  isMonthly,
  priority,
  duration,
  isAutomatic,
  scheduleTime, // e.g., "3:00 PM – 3:45 PM"
  onReschedule,
  onDone,
}) {
  const navigation = useNavigation();

  return (
    <View style={styles.taskCard}>
      {/* TOP RIGHT ICONS */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("EditTask")}
        >
          <MaterialCommunityIcons name="pencil" size={22} color="#6C63FF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <MaterialCommunityIcons name="delete" size={22} color="#D9534F" />
        </TouchableOpacity>
      </View>

      {/* TITLE */}
      <Text style={styles.taskTitle}>{name}</Text>

      {/* META INFO */}
      <Text style={styles.taskSub}>
        {isMonthly ? "Monthly Task" : `Due: ${due}`} • Priority: {priority}
      </Text>

      {/* DURATION */}

      <Text style={styles.duration}>Duration: {duration}</Text>
      {/* DURATION + TIME */}
      <Text style={styles.taskSchedule}>Scheduled: {scheduleTime}</Text>

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
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  iconRow: {
    position: "absolute",
    right: 12,
    top: 12,
    flexDirection: "row",
    zIndex: 10,
  },

  iconBtn: {
    padding: 4,
  },

  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    paddingRight: 30,
  },

  taskSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6F6F6F",
  },

  duration: {
    marginTop: 6,
    fontSize: 14,
    color: "#444",
  },

  taskSchedule: {
    marginTop: 10,
    fontSize: 13,
    color: "#6F6F6F",
  },

  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
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

  doneBtn: {
    borderWidth: 1.2,
    borderColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  doneText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 13,
  },
});
