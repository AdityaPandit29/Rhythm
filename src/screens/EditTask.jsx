import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

export default function EditTask() {
  const navigation = useNavigation();

  // 👉 ADD YOUR STATES HERE (taskName, isMonthly, deadline, priority, autoSchedule, duration, times, etc.)

  const validateAndSave = () => {
    // 👉 VALIDATE & SAVE LOGIC HERE
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.topText}>
          <Text style={styles.title}>Edit Task</Text>
          <Text style={styles.subtitle}>Update your task details.</Text>
        </View>

        {/* TASK NAME */}
        <View style={styles.section}>
          <Text style={styles.label}>Task Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter task name"
            placeholderTextColor="#999"
            // 👉 onChangeText=...
          />
        </View>

        {/* MONTHLY TOGGLE */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Repeat Monthly</Text>
            <Switch
              // 👉 value={isMonthly} onValueChange={setIsMonthly}
              trackColor={{ false: "#ccc", true: "#6C63FF" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* PRIORITY */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>

          <View style={styles.typeRow}>
            {/* LOW */}
            <Pressable
              style={[styles.typeOption]}
              // 👉 onPress={() => setPriority("low")}
            >
              <MaterialCommunityIcons
                name="arrow-down"
                size={20}
                color="#6C63FF"
              />
              <Text style={styles.typeText}>Low</Text>
            </Pressable>

            {/* MEDIUM */}
            <Pressable
              style={[styles.typeOption]}
              // 👉 onPress={() => setPriority("medium")}
            >
              <MaterialCommunityIcons name="minus" size={20} color="#6C63FF" />
              <Text style={styles.typeText}>Medium</Text>
            </Pressable>

            {/* HIGH */}
            <Pressable
              style={[styles.typeOption]}
              // 👉 onPress={() => setPriority("high")}
            >
              <MaterialCommunityIcons
                name="arrow-up"
                size={20}
                color="#6C63FF"
              />
              <Text style={styles.typeText}>High</Text>
            </Pressable>
          </View>
        </View>

        {/* AUTO-SCHEDULE TOGGLE */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              Auto-schedule the best time for this task
            </Text>
            <Switch
              // 👉 value={autoSchedule} onValueChange={setAutoSchedule}
              trackColor={{ false: "#ccc", true: "#6C63FF" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* DEADLINE */}
        <View style={styles.section}>
          <Text style={styles.label}>Deadline</Text>
          <View style={styles.timeRow}>
            {/* DATE PICKER */}
            <Pressable
              style={styles.timeCard}
              // 👉 onPress: open date picker
            >
              <Text style={styles.timeSmall}>Date</Text>
              <Text style={styles.timeLarge}>Dec 20</Text>
              {/* 👉 replace with selected date */}
            </Pressable>

            {/* TIME PICKER */}
            <Pressable
              style={styles.timeCard}
              // 👉 onPress: open time picker
            >
              <Text style={styles.timeSmall}>Time</Text>
              <Text style={styles.timeLarge}>5:00 PM</Text>
              {/* 👉 replace with selected time */}
            </Pressable>
          </View>
        </View>

        {/* IF AUTO-SCHEDULE ON → SHOW DURATION INPUTS */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration</Text>

          <View style={styles.timeRow}>
            {/* HOURS */}
            <Pressable
              style={styles.timeCard}
              // 👉 open hour picker
            >
              <Text style={styles.timeSmall}>Hours</Text>
              <Text style={styles.timeLarge}>1 hr</Text>
            </Pressable>

            {/* MINUTES */}
            <Pressable
              style={styles.timeCard}
              // 👉 open minute picker
            >
              <Text style={styles.timeSmall}>Minutes</Text>
              <Text style={styles.timeLarge}>30 min</Text>
            </Pressable>
          </View>

          {/* INFO IF DURATION = 0 */}
          {/* 👉 Show conditionally if duration = 0 */}
          {/* <Text style={{ marginTop: 8, color: "#777", fontSize: 12 }}>
            Rhythm will place this task in any free time.
          </Text> */}
        </View>

        {/* MANUAL TIME SELECTOR (ONLY IF AUTO-SCHEDULE OFF) */}
        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>

          <View style={styles.timeRow}>
            <Pressable
              style={styles.timeCard}
              // 👉 open start time picker
            >
              <Text style={styles.timeSmall}>Start</Text>
              <Text style={styles.timeLarge}>2:00 PM</Text>
            </Pressable>

            <Pressable
              style={styles.timeCard}
              // 👉 open end time picker
            >
              <Text style={styles.timeSmall}>End</Text>
              <Text style={styles.timeLarge}>3:00 PM</Text>
            </Pressable>
          </View>
        </View>

        {/* SAVE BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={validateAndSave}>
            <Text style={styles.saveBtnText}>Save Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------------- STYLES (Same as EditHabit) -------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  topText: {
    marginBottom: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },

  subtitle: {
    marginTop: 6,
    color: "#666",
  },

  section: {
    marginTop: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    color: "#333",
  },

  /* TYPE/PRIORITY OPTIONS */
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
  },

  typeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  /* TOGGLE */
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  toggleText: {
    fontSize: 14,
    color: "#444",
    flex: 1,
    fontWeight: 600,
  },

  /* TIME CARDS */
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  timeCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  timeSmall: {
    fontSize: 12,
    color: "#777",
  },

  timeLarge: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },

  /* FOOTER BUTTON */
  footer: {
    marginTop: 28,
  },

  saveBtn: {
    backgroundColor: "#6C63FF",
    paddingVertical: 16,
    borderRadius: 14,
  },

  saveBtnText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
