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

export default function EditHabit() {
  const navigation = useNavigation();

  // 👉 ADD YOUR STATES HERE (habitName, type, duration, selectedDays, etc.)

  const validateAndSave = () => {
    // 👉 VALIDATION + SAVE LOGIC HERE
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
            // 👉 onChangeText here
          />
        </View>

        {/* TYPE SELECTOR */}
        {/* <View style={styles.section}>
          <Text style={styles.label}>Habit Type</Text>

          <View style={styles.typeRow}> */}
        {/* FIXED TYPE */}
        {/* <Pressable
              style={[styles.typeOption]}
              // 👉 Add onPress=setType("fixed")
            >
              <MaterialCommunityIcons
                name="clock-time-four"
                size={20}
                color="#6C63FF"
              />
              <Text style={styles.typeText}>Fixed Time</Text>
            </Pressable> */}

        {/* FLEXIBLE TYPE */}
        {/* <Pressable
              style={[styles.typeOption]}
              // 👉 Add onPress=setType("flexible")
            >
              <MaterialCommunityIcons
                name="infinity"
                size={20}
                color="#6C63FF"
              />
              <Text style={styles.typeText}>Flexible</Text>
            </Pressable>
          </View>
        </View> */}

        {/* DURATION (HOURS + MINUTES) */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration</Text>

          <View style={styles.timeRow}>
            {/* HOURS */}
            <Pressable
              style={styles.timeCard}
              // 👉 onPress: open hour picker modal
            >
              <Text style={styles.timeSmall}>Hours</Text>
              <Text style={styles.timeLarge}>1 hr</Text>
              {/* 👉 replace with selectedHours */}
            </Pressable>

            {/* MINUTES */}
            <Pressable
              style={styles.timeCard}
              // 👉 onPress: open minute picker modal
            >
              <Text style={styles.timeSmall}>Minutes</Text>
              <Text style={styles.timeLarge}>30 min</Text>
              {/* 👉 replace with selectedMinutes */}
            </Pressable>
          </View>
        </View>

        {/* WEEKDAY SELECTOR */}
        <View style={styles.section}>
          <Text style={styles.label}>Repeat On</Text>
          <View style={styles.daysRow}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, index) => (
              <Pressable
                key={index}
                style={styles.dayBubble}
                // 👉 toggle day selection here
              >
                <Text style={styles.dayText}>{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* TOGGLE: LET RHYTHM DECIDE */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              Auto-schedule the best time for this habit
            </Text>

            <Switch
              // 👉 Add logic: value={autoSchedule} onValueChange={setAutoSchedule}
              trackColor={{ false: "#ccc", true: "#6C63FF" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* TIME */}
        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={styles.timeCard}>
              <Text style={styles.timeSmall}>Start</Text>
              <Text style={styles.timeLarge}>9:00 AM</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity style={styles.timeCard}>
              <Text style={styles.timeSmall}>End</Text>
              <Text style={styles.timeLarge}>5:00 PM</Text>
            </TouchableOpacity> */}
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

  /* TYPE OPTIONS */
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

  /* TIME */
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

    // shadow
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

  /* WEEKDAYS */
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

  /* FOOTER */
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
