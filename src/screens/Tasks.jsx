import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

export default function Tasks() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ADD TASK BUTTON */}
        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={() => navigation.navigate("EditTask")}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#6C63FF" />
          <Text style={styles.addTaskText}>Add Task</Text>
        </TouchableOpacity>

        {/* TASK CARD 1 */}
        <Pressable style={styles.taskCard}>
          <Text style={styles.taskTitle}>Complete Assignment</Text>

          <Text style={styles.taskSub}>
            Due: Today 5:00 PM | Priority: High
          </Text>

          <Text style={styles.taskDuration}>Duration: 45 min</Text>

          <Text style={styles.taskSchedule}>Scheduled: 3:00 PM – 3:45 PM</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.rescheduleBtn}>
              <Text style={styles.rescheduleText}>Reschedule</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>

        {/* TASK CARD 2 */}
        <Pressable style={styles.taskCard}>
          <Text style={styles.taskTitle}>Monthly Fee Payment</Text>

          <Text style={styles.taskSub}>Monthly Task</Text>

          <Text style={styles.taskDuration}>Duration: 10 min</Text>

          <Text style={styles.taskSchedule}>Suggested: 6:00 PM</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.acceptBtn}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rescheduleBtn}>
              <Text style={styles.rescheduleText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* ADD TASK BUTTON */
  addTaskBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: "#6C63FF",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },

  addTaskText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6C63FF",
  },

  /* TASK CARD */
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

  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },

  taskSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6F6F6F",
  },

  taskDuration: {
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

  acceptBtn: {
    borderWidth: 1.2,
    borderColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  acceptText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 13,
  },
});
