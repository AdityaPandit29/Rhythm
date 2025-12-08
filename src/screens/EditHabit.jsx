import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

export default function EditHabit() {
  const navigation = useNavigation();

  // TODO: Add states later (habitName, type, startTime, duration, weekdays)

  const validateAndSave = () => {
    // TODO: Validate fields, save habit, update store
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
          <Text style={styles.title}>Edit Habit</Text>
          <Text style={styles.subtitle}>Update your habit details.</Text>
        </View>

        {/* HABIT NAME */}
        <View style={styles.section}>
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter habit name"
            placeholderTextColor="#999"
            // TODO: onChangeText
          />
        </View>

        {/* TYPE SELECTOR */}
        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>

          <View style={styles.typeRow}>
            {/* FIXED TIME */}
            <Pressable
              style={styles.typeOption}
              // TODO: Add type = "fixed"
            >
              <MaterialCommunityIcons
                name="clock-time-four"
                size={20}
                color="#6C63FF"
              />
              <Text style={styles.typeText}>Fixed Time</Text>
            </Pressable>

            {/* FLEXIBLE */}
            <Pressable
              style={styles.typeOption}
              // TODO: Add type = "flexible"
            >
              <MaterialCommunityIcons
                name="infinity"
                size={20}
                color="#6C63FF"
              />
              <Text style={styles.typeText}>Flexible</Text>
            </Pressable>
          </View>
        </View>

        {/* START TIME — only for FIXED type */}
        <View style={styles.section}>
          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity
            style={styles.timePicker}
            // TODO: open expo-datetime-picker
          >
            <Text style={styles.timeText}>7:00 PM</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#444"
            />
          </TouchableOpacity>
        </View>

        {/* DURATION */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 20"
            placeholderTextColor="#999"
            keyboardType="numeric"
            // TODO: Add logic to update duration
          />
        </View>

        {/* WEEKDAY SELECTOR */}
        <View style={styles.section}>
          <Text style={styles.label}>Repeat On</Text>
          <View style={styles.daysRow}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, index) => (
              <Pressable
                key={index}
                style={styles.dayBubble}
                // TODO: toggle weekday selection
              >
                <Text style={styles.dayText}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* SAVE BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={validateAndSave}>
            <Text style={styles.saveBtnText}>Save Habit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------------- STYLES -------------------------------- */

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

  /* TYPE SELECTION */
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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

  /* WEEKDAY SELECTOR */
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  dayBubble: {
    backgroundColor: "#F7F7FF",
    width: 38,
    height: 38,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
