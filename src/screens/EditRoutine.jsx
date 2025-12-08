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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
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

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // displayed labels

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
  const [startTime, setStartTime] = useState(existing.startTime ?? "09:00 AM");
  const [endTime, setEndTime] = useState(existing.endTime ?? "05:00 PM");
  // days: array of booleans [Mon..Sun]
  const [days, setDays] = useState(
    existing.days ?? [true, true, true, true, true, false, false] // default: Mon-Fri selected
  );

  // quick helper to format times if needed (placeholder)
  const timeToString = (h, m) => {
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // TODO: Integrate a real time picker. For now this stub cycles through a few sample times
  // so the UI can be tested on device/emulator without extra packages.
  const openTimePicker = async (which) => {
    // which = "start" or "end"
    // Replace this block with your preferred time picker.
    const samples = [
      "06:30 AM",
      "07:00 AM",
      "08:00 AM",
      "06:00 PM",
      "07:30 PM",
      "09:00 PM",
    ];
    if (which === "start") {
      // pick next sample
      const idx = samples.indexOf(startTime);
      const next = samples[(idx + 1) % samples.length];
      setStartTime(next);
    } else {
      const idx = samples.indexOf(endTime);
      const next = samples[(idx + 1) % samples.length];
      setEndTime(next);
    }
  };

  const toggleDay = (index) => {
    const copy = [...days];
    copy[index] = !copy[index];
    setDays(copy);
  };

  const validateAndSave = () => {
    // Basic validation: at least one day selected
    if (!days.some(Boolean)) {
      Alert.alert(
        "Select days",
        "Please select at least one day for this routine."
      );
      return;
    }

    // Basic time validation (rudimentary because we store strings).
    // For robust checks, convert times to minutes since midnight.
    const parseTimeToMinutes = (t) => {
      // Example input: "7:30 PM" or "07:30 AM" or "19:00"
      const d = new Date("1970-01-01 " + (t.includes("M") ? t : t));
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
      // fallback: try manual parse
      const parts = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!parts) return null;
      let hh = parseInt(parts[1], 10);
      const mm = parseInt(parts[2], 10);
      const ampm = parts[3];
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
        if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
      }
      return hh * 60 + mm;
    };

    const s = parseTimeToMinutes(startTime);
    const e = parseTimeToMinutes(endTime);
    if (s === null || e === null) {
      Alert.alert("Invalid time", "Please set valid start and end times.");
      return;
    }
    if (s >= e) {
      Alert.alert("Time error", "Start time must be earlier than end time.");
      return;
    }

    const routine = {
      id: existing.id ?? Date.now().toString(),
      label: label.trim(),
      startTime,
      endTime,
      days,
      createdAt: existing.createdAt ?? new Date().toISOString(),
    };

    // Return new/updated routine to previous screen (or replace with API call)
    // You might want to call an API / save to AsyncStorage / dispatch redux action here.
    navigation.goBack(); // go back first
    // Optionally pass data back:
    if (route.params?.onSave && typeof route.params.onSave === "function") {
      route.params.onSave(routine);
    } else {
      // If your navigation expects returned params, you can use:
      // navigation.navigate("RoutinesHome", { newRoutine: routine })
      console.log("Saved routine:", routine);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      title: mode === "edit" ? "Edit Routine" : "Add Routine",
      headerTitleAlign: "center",
    });
  }, [navigation, mode]);

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
            <TouchableOpacity
              style={styles.timeCard}
              onPress={() => openTimePicker("start")}
            >
              <Text style={styles.timeSmall}>Start</Text>
              <Text style={styles.timeLarge}>{startTime}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeCard}
              onPress={() => openTimePicker("end")}
            >
              <Text style={styles.timeSmall}>End</Text>
              <Text style={styles.timeLarge}>{endTime}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Days */}
        <View style={styles.section}>
          <Text style={styles.label}>Repeat</Text>
          <View style={styles.daysRow}>
            {WEEK_DAYS.map((d, i) => {
              const selected = days[i];
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleDay(i)}
                  style={[
                    styles.dayChip,
                    selected ? styles.dayChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected ? styles.dayTextActive : null,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    fontSize: 16,
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
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
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
    marginTop: 8,
    flexWrap: "wrap",
    gap: 10,
  },

  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 44,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  dayChipActive: {
    backgroundColor: "#6C63FF",
  },

  dayText: {
    fontWeight: "700",
    color: "#333",
  },

  dayTextActive: {
    color: "#FFFFFF",
  },

  footer: {
    marginTop: 28,
  },

  saveBtn: {
    backgroundColor: "#111111",
    paddingVertical: 16,
    borderRadius: 20,
  },

  saveBtnText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
});
