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

  const validateAndSave = () => {
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
            // TODO: Add onChangeText to update task name
          />
        </View>

        {/* MONTHLY TASK TOGGLE */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Switch
              value={false}
              onValueChange={() => {}}
              // TODO: handle toggle monthly state
              thumbColor="#6C63FF"
            />
            <Text style={styles.toggleText}>Repeat every month</Text>
          </View>
        </View>

        {/* DEADLINE PICKER */}
        <View style={styles.section}>
          <Text style={styles.label}>Deadline</Text>

          <TouchableOpacity
            style={styles.timePicker}
            // TODO: open date + time picker using expo-datetime-picker
          >
            <Text style={styles.timeText}>Today • 5:00 PM</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#444"
            />
          </TouchableOpacity>
        </View>

        {/* PRIORITY SELECTOR */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>

          <View style={styles.priorityRow}>
            {/* HIGH */}
            <Pressable
              style={styles.priorityOption}
              // TODO: set priority = high
            >
              <MaterialCommunityIcons
                name="arrow-up-bold"
                size={20}
                color="#FF4D4D"
              />
              <Text style={styles.priorityText}>High</Text>
            </Pressable>

            {/* MEDIUM */}
            <Pressable
              style={styles.priorityOption}
              // TODO: set priority = medium
            >
              <MaterialCommunityIcons
                name="arrow-right-bold"
                size={20}
                color="#FFA500"
              />
              <Text style={styles.priorityText}>Medium</Text>
            </Pressable>

            {/* LOW */}
            <Pressable
              style={styles.priorityOption}
              // TODO: set priority = low
            >
              <MaterialCommunityIcons
                name="arrow-down-bold"
                size={20}
                color="#4CAF50"
              />
              <Text style={styles.priorityText}>Low</Text>
            </Pressable>
          </View>
        </View>

        {/* TIME MODE SELECTOR */}
        <View style={styles.section}>
          <Text style={styles.label}>Schedule Mode</Text>

          <View style={styles.modeRow}>
            {/* MANUAL MODE */}
            <Pressable
              style={styles.modeOption}
              // TODO: set state: setMode("manual")
            >
              <MaterialCommunityIcons
                name="clock-edit-outline"
                size={20}
                color="#6C63FF"
              />
              <Text style={styles.modeText}>Manual Time</Text>
            </Pressable>

            {/* AUTOMATIC MODE */}
            <Pressable
              style={styles.modeOption}
              // TODO: set state: setMode("auto")
            >
              <MaterialCommunityIcons name="brain" size={20} color="#6C63FF" />
              <Text style={styles.modeText}>Automatic</Text>
            </Pressable>
          </View>
        </View>

        {/* MANUAL TIME PICKERS */}
        {/* TODO: Render this only if mode === "manual" */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Time</Text>

          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeBlock}
              // TODO: open start time picker
            >
              <Text style={styles.timeText}>Start Time</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#444"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeBlock}
              // TODO: open end time picker
            >
              <Text style={styles.timeText}>End Time</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#444"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* AUTOMATIC MODE DURATION INPUT */}
        {/* TODO: Render this only if mode === "auto" */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 45"
            placeholderTextColor="#999"
            keyboardType="numeric"
            // TODO: setDuration
          />
        </View>

        {/* SAVE BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={validateAndSave}
            // TODO: Add onPress to save task and navigate back
          >
            <Text style={styles.saveBtnText}>Save Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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

  /* TIME PICKER */
  timePicker: {
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  timeText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },

  /* MONTHLY TOGGLE */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },

  toggleText: {
    fontSize: 15,
    color: "#333",
  },

  /* PRIORITY */
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  priorityOption: {
    flex: 1,
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  priorityText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  /* TIME MODE SELECTOR */
  modeRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  modeOption: {
    flex: 1,
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  modeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  timeBlock: {
    flex: 1,
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* SAVE BUTTON */
  footer: {
    marginTop: 28,
  },

  saveBtn: {
    backgroundColor: "#6C63FF",
    paddingVertical: 16,
    borderRadius: 14,
  },

  saveBtnText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
});
