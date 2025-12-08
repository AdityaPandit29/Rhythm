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
import TaskCard from "../components/TaskCard";

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

        <TaskCard
          id={1}
          name="Complete Assignment"
          due="Today 5:00 pm"
          isMonthly={false}
          duration="45 min"
          priority="High"
          isAutomatic={true}
          scheduleTime="3:00 PM - 3:45 PM"
          onReschedule={() => console.log("Reschedule")}
          onDone={() => console.log("Done!")}
        />

        <TaskCard
          id={2}
          name="Monthly Fee Payment"
          due="Tomorrow 6:00 pm"
          isMonthly={true}
          duration="45 min"
          priority="Low"
          isAutomatic={false}
          scheduleTime="6:00 PM"
          onReschedule={() => console.log("Reschedule")}
          onDone={() => console.log("Done!")}
        />
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
    fontWeight: "700",
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
    borderWidth: 1.5,
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

    position: "relative",
  },

  editIcon: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 6,
  },

  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    paddingRight: 35, // space for edit icon
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

  /* BUTTON STYLES */
  rescheduleBtn: {
    borderWidth: 1.2,
    borderColor: "#6C63FF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  rescheduleText: {
    color: "#6C63FF",
    fontWeight: "700",
    fontSize: 13,
  },

  doneBtn: {
    borderWidth: 1.2,
    borderColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  doneText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 13,
  },
});
