import { useState } from "react";
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
import { useSQLiteContext } from "expo-sqlite";
import {
  intervalsOverlap,
  groupBusyBlocks,
  loadManualBlocks,
  rebalance,
  cleanupExpiredTasks,
  getNextWorkingDate,
} from "../utils/scheduling.js";
import { rescheduleNotificationsIfAllowed } from "../utils/notify.js";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"]; // displayed labels

export default function EditRoutine() {
  const db = useSQLiteContext();

  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  // Mode: 'add' or 'edit'
  const mode = params.mode === "edit" ? "edit" : "add";

  // If editing, route.params.routine may contain fields: {label, startTime, endTime, days}
  const existing = params.routine || {};

  // State
  const [label, setLabel] = useState(existing.label ?? "");

  const [startMinutes, setStartMinutes] = useState(
    existing?.startMinutes ?? 540,
  );
  const [endMinutes, setEndMinutes] = useState(existing?.endMinutes ?? 1020);
  const [activePicker, setActivePicker] = useState(null); // "start" or "end"
  const [showTimePicker, setShowTimePicker] = useState(false);
  // days: array of booleans [Mon..Sun]
  const [days, setDays] = useState(existing.days ?? Array(7).fill(false));

  function minutesToTimeAMPM(minutes) {
    let hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // 0 → 12, 13 → 1
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")} ${ampm}`;
  }

  function minutesToDate(minutes) {
    const now = new Date();
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );
    date.setMinutes(minutes);
    return date;
  }

  const toggleDay = (index) => {
    const copy = [...days];
    copy[index] = !copy[index];
    setDays(copy);
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (!selectedTime) return;

    const minutes = selectedTime.getHours() * 60 + selectedTime.getMinutes();

    if (activePicker === "start") {
      setStartMinutes(minutes);
    } else {
      setEndMinutes(minutes);
    }
  };

  const buildIntervalsFromSelection = (days, startM, endM) => {
    const intervals = [];

    for (let day = 0; day < 7; day++) {
      if (!days[day]) continue;

      if (startM < endM) {
        // Normal same-day routine
        intervals.push({ day, start: startM, end: endM });
      } else {
        // Overnight routine → split
        intervals.push({ day, start: startM, end: 1440 });
        intervals.push({ day: (day + 1) % 7, start: 0, end: endM });
      }
    }

    return intervals;
  };

  // added days. if any error occurs remove it
  const findConflict = ({ items, days, startM, endM }) => {
    const newIntervals = buildIntervalsFromSelection(days, startM, endM);

    for (let item of items) {
      // Skip self when editing habit
      if (
        mode === "edit" &&
        item.type === "routine" &&
        item.id === existing?.id
      ) {
        continue;
      }

      if (item.type === "task") {
        for (const ni of newIntervals) {
          // new intervals
          for (const ei of item.intervals) {
            // existing intervals
            const day = new Date(ei.date).getDay();

            if (ni.day !== day) continue;

            if (intervalsOverlap(ni.start, ni.end, ei.start, ei.end)) {
              return {
                type: item.type,
                title: item.title,
              };
            }
          }
        }
      } else {
        for (const ni of newIntervals) {
          for (const ei of item.intervals) {
            if (ni.day !== ei.day) continue;

            if (intervalsOverlap(ni.start, ni.end, ei.start, ei.end)) {
              return {
                type: item.type,
                title: item.title,
              };
            }
          }
        }
      }
    }
    return null;
  };

  const validateAndSave = async () => {
    try {
      if (!label.trim()) {
        return Alert.alert("Missing Name", "Please enter a routine name.");
      }

      if (!days.some((d) => d)) {
        return Alert.alert("Missing Days", "Please select at least one day.");
      }

      if (startMinutes === endMinutes) {
        return Alert.alert("Time Error", "Start and end time cannot be same.");
      }

      const startM = startMinutes;
      const endM = endMinutes;

      await cleanupExpiredTasks(db);

      /* ---------- LOAD ALL BUSY BLOCKS ---------- */
      const blocks = await loadManualBlocks(db);
      const busyItems = groupBusyBlocks(blocks);

      // --- CHECK CONFLICT ---

      const conflict = findConflict({ items: busyItems, days, startM, endM });
      if (conflict) {
        return Alert.alert(
          "Time Conflict",
          `This routine overlaps with ${conflict.type}: "${conflict.title}".`,
        );
      }
      await db.runAsync("BEGIN TRANSACTION");

      // --- SAVE ROUTINE ---
      if (mode === "add") {
        const result = await db.runAsync(
          `INSERT INTO routines 
            (title)
          VALUES (?);`,
          [label.trim()],
        );
        const newId = result.lastInsertRowId;

        if (!newId) {
          throw new Error("Insert succeeded but couldn't read new row id.");
        }

        // insert schedule
        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            if (startM < endM) {
              await db.runAsync(
                `INSERT INTO routine_schedules (routineId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [newId, i, startM, endM],
              );
            } else {
              await db.runAsync(
                `INSERT INTO routine_schedules (routineId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [newId, i, startM, 1440],
              );

              await db.runAsync(
                `INSERT INTO routine_schedules (routineId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [newId, (i + 1) % 7, 0, endM],
              );
            }
          }
        }
      } else {
        // update routine
        if (!existing?.id) throw new Error("Missing routine id for update.");
        await db.runAsync(
          `UPDATE routines SET 
            title=?
          WHERE id=?`,
          [label.trim(), existing.id],
        );

        // delete old days
        await db.runAsync(`DELETE FROM routine_schedules WHERE routineId=?`, [
          existing.id,
        ]);

        // insert new days
        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            if (startM < endM) {
              await db.runAsync(
                `INSERT INTO routine_schedules (routineId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [existing.id, i, startM, endM],
              );
            } else {
              await db.runAsync(
                `INSERT INTO routine_schedules (routineId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [existing.id, i, startM, 1440],
              );

              await db.runAsync(
                `INSERT INTO routine_schedules (routineId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [existing.id, (i + 1) % 7, 0, endM],
              );
            }
          }
        }
      }

      const nextWorkingDate = getNextWorkingDate(days);

      //REBALANCE
      await rebalance(
        db,
        "routine",
        nextWorkingDate.toLocaleDateString("sv-SE"),
        startM,
      );

      await db.runAsync("COMMIT");
      await rescheduleNotificationsIfAllowed(db);
      navigation.goBack();
    } catch (err) {
      await db.runAsync("ROLLBACK");
      // console.error("validateAndSave (routine) error:", err);
      Alert.alert(
        "Save Failed",
        err?.message || "Something went wrong while saving the routine.",
      );
    }
  };

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
          <Text style={styles.label}>Routine Name</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#999"
            placeholder="Enter routine name"
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
                {minutesToTimeAMPM(startMinutes)}
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
                {minutesToTimeAMPM(endMinutes)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={
              activePicker === "start"
                ? minutesToDate(startMinutes)
                : minutesToDate(endMinutes)
            }
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
                  days[(index + 1) % 7] && { backgroundColor: "#6C63FF" },
                ]}
                onPress={() => toggleDay((index + 1) % 7)}
              >
                <Text
                  style={[
                    styles.dayText,
                    days[(index + 1) % 7] && { color: "#fff" },
                  ]}
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
