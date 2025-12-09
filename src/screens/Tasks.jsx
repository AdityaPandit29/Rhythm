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
          startTime="3:00 PM"
          endTime="3:45 PM"
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
          startTime="6:00 PM"
          endTime="7:00 PM"
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
    backgroundColor: "#FFFFFF",
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
});
