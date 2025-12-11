// RoutineEditorScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

/**
 * Routine Editor screen (Add / Edit)
 *
 * Fields:
 *  - label (optional)
 *  - startTime (string: "07:30 AM")
 *  - endTime   (string: "09:00 AM")
 *  - days      (array of booleans Mon..Sun)
 *
 * Integration notes:
 * - Replace `openTimePicker` implementation with a proper native time picker
 *   (recommended: expo-datetime-picker or @react-native-community/datetimepicker)
 * - Save action currently calls navigation.goBack({ routine }) — replace with API/DB call as needed.
 */

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"]; // displayed labels

export default function EditRoutine() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  // Mode: 'add' or 'edit'
  const mode = params.mode === "edit" ? "edit" : "add";

  // If editing, route.params.routine may contain fields: {label, startTime, endTime, days}
  const existing = params.routine || {};

  // State
  const [label, setLabel] = useState(existing.label ?? "");
  const [startTime, setStartTime] = useState(
    existing.startTime ?? new Date(new Date().setHours(9, 0, 0, 0))
  );
  const [endTime, setEndTime] = useState(
    existing.endTime ?? new Date(new Date().setHours(5, 0, 0, 0))
  );
  const [activePicker, setActivePicker] = useState(null); // "start" or "end"
  const [showTimePicker, setShowTimePicker] = useState(false);
  // days: array of booleans [Mon..Sun]
  const [days, setDays] = useState(existing.days ?? Array(7).fill(false));

  const toggleDay = (index) => {
    const copy = [...days];
    copy[index] = !copy[index];
    setDays(copy);
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (!selectedTime) return;

    if (activePicker === "start") {
      setStartTime(selectedTime);
    } else {
      setEndTime(selectedTime);
    }
  };

  const validateAndSave = () => {
    // Basic validation: at least one day selected
    // if (!days.some(Boolean)) {
    //   Alert.alert(
    //     "Select days",
    //     "Please select at least one day for this routine."
    //   );
    //   return;
    // }

    // // Basic time validation (rudimentary because we store strings).
    // // For robust checks, convert times to minutes since midnight.
    // const parseTimeToMinutes = (t) => {
    //   // Example input: "7:30 PM" or "07:30 AM" or "19:00"
    //   const d = new Date("1970-01-01 " + (t.includes("M") ? t : t));
    //   if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    //   // fallback: try manual parse
    //   const parts = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    //   if (!parts) return null;
    //   let hh = parseInt(parts[1], 10);
    //   const mm = parseInt(parts[2], 10);
    //   const ampm = parts[3];
    //   if (ampm) {
    //     if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
    //     if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
    //   }
    //   return hh * 60 + mm;
    // };

    // const s = parseTimeToMinutes(startTime);
    // const e = parseTimeToMinutes(endTime);
    // if (s === null || e === null) {
    //   Alert.alert("Invalid time", "Please set valid start and end times.");
    //   return;
    // }
    // if (s >= e) {
    //   Alert.alert("Time error", "Start time must be earlier than end time.");
    //   return;
    // }

    // const routine = {
    //   id: existing.id ?? Date.now().toString(),
    //   label: label.trim(),
    //   startTime,
    //   endTime,
    //   days,
    //   createdAt: existing.createdAt ?? new Date().toISOString(),
    // };

    // Return new/updated routine to previous screen (or replace with API call)
    // You might want to call an API / save to AsyncStorage / dispatch redux action here.
    navigation.goBack(); // go back first
    // Optionally pass data back:
    // if (route.params?.onSave && typeof route.params.onSave === "function") {
    //   route.params.onSave(routine);
    // } else {
    //   // If your navigation expects returned params, you can use:
    //   // navigation.navigate("RoutinesHome", { newRoutine: routine })
    //   console.log("Saved routine:", routine);
    // }
  };

  // useEffect(() => {
  //   navigation.setOptions({
  //     title: mode === "edit" ? "Edit Routine" : "Add Routine",
  //     headerTitleAlign: "center",
  //   });
  // }, [navigation, mode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topText}>
          <Text style={styles.title}>
            {mode === "edit" ? "Edit Routine" : "Add Routine"}
          </Text>
          <Text style={styles.subtitle}>
            Set a busy time block for your day.
          </Text>
        </View>

        {/* Label */}
        <View style={styles.section}>
          <Text style={styles.label}>Label (optional)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#999"
            placeholder="e.g. Office, Gym, Study"
            value={label}
            onChangeText={setLabel}
            returnKeyType="done"
          />
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>

          <View style={styles.timeRow}>
            {/* Start Time */}
            <TouchableOpacity
              style={styles.timeCard}
              onPress={() => {
                setActivePicker("start");
                setShowTimePicker(true);
              }}
            >
              <Text style={styles.timeSmall}>Start</Text>
              <Text style={styles.timeLarge}>
                {startTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </TouchableOpacity>

            {/* End Time */}
            <TouchableOpacity
              style={styles.timeCard}
              onPress={() => {
                setActivePicker("end");
                setShowTimePicker(true);
              }}
            >
              <Text style={styles.timeSmall}>End</Text>
              <Text style={styles.timeLarge}>
                {endTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={activePicker === "start" ? startTime : endTime}
            mode="time"
            display="spinner"
            onChange={onChangeTime}
          />
        )}

        {/* WEEKDAY SELECTOR */}
        <View style={styles.section}>
          <Text style={styles.label}>Repeat On</Text>
          <View style={styles.daysRow}>
            {WEEK_DAYS.map((d, index) => (
              <Pressable
                key={index}
                style={[
                  styles.dayBubble,
                  days[index] && { backgroundColor: "#6C63FF" },
                ]}
                onPress={() => toggleDay(index)}
              >
                <Text
                  style={[styles.dayText, days[index] && { color: "#fff" }]}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Save */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={validateAndSave}>
            <Text style={styles.saveBtnText}>Save Routine</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },

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
    color: "#333",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    color: "#333",
  },

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

  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  dayBubble: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: "#F7F7FF",
    justifyContent: "center",
    alignItems: "center",
  },

  dayText: {
    fontWeight: "600",
    color: "#333",
  },

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
