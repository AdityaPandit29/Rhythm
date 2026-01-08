import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSQLiteContext } from "expo-sqlite";
import {
  intervalsOverlap,
  groupBusyBlocks,
  loadManualBlocks,
  rebalance,
} from "../utils/scheduling.js";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function EditHabit() {
  const db = useSQLiteContext();

  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const mode = params.mode === "edit" ? "edit" : "add";
  const existing = params.habit || {};

  /* ------------------------- STATES ------------------------- */
  const [habitName, setHabitName] = useState(existing?.habitName ?? "");
  const [days, setDays] = useState(existing?.days ?? Array(7).fill(false));

  const [startMinutes, setStartMinutes] = useState(
    existing?.startMinutes ?? 1080
  );
  const [endMinutes, setEndMinutes] = useState(existing?.endMinutes ?? 1140);
  const [activePicker, setActivePicker] = useState(null); // "start" or "end"
  const [showTimePicker, setShowTimePicker] = useState(false);

  /* ------------------------- FUNCTIONS ------------------------- */

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
      0
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

  const findConflict = ({ items, startM, endM }) => {
    const newIntervals = buildIntervalsFromSelection(days, startM, endM);

    for (let item of items) {
      // Skip self when editing habit
      if (
        mode === "edit" &&
        item.type === "habit" &&
        item.id === existing?.id
      ) {
        continue;
      }

      if (item.type === "task") {
        for (let i = 0; i < item.dates.length; i++) {
          const weekday = new Date(item.dates[i]).getDay();

          if (!days[weekday]) continue;

          if (
            intervalsOverlap(startM, endM, item.start_minutes, item.end_minutes)
          ) {
            return {
              type: item.type,
              title: item.title,
            };
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
      /* ---------- BASIC VALIDATION ---------- */
      if (!habitName.trim()) {
        return Alert.alert("Missing Name", "Please enter a habit name.");
      }

      if (!days.some((d) => d)) {
        return Alert.alert("Missing Days", "Please select at least one day.");
      }

      if (startMinutes === endMinutes) {
        return Alert.alert("Time Error", "Start and end time cannot be same.");
      }

      const startM = startMinutes;
      const endM = endMinutes;

      /* ---------- LOAD ALL BUSY BLOCKS ---------- */
      const { recurring, manualTasks } = await loadManualBlocks(db);
      const busyItems = groupBusyBlocks(recurring, manualTasks);

      /* ---------- CONFLICT CHECK ---------- */
      const conflict = findConflict({ items: busyItems, startM, endM });
      if (conflict) {
        return Alert.alert(
          "Time Conflict",
          `This habit overlaps with ${conflict.type}: "${conflict.title}".`
        );
      }
      await db.runAsync("BEGIN TRANSACTION");

      /* ---------- SAVE HABIT ---------- */
      if (mode === "add") {
        const result = await db.runAsync(
          `INSERT INTO habits
            (title)
            VALUES (?, ?, ?)`,
          [habitName.trim()]
        );

        const newId = result.lastInsertRowId;
        if (!newId)
          throw new Error("Insert succeeded but couldn't read new row id.");

        //insert schedule
        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            if (startM < endM) {
              await db.runAsync(
                `INSERT INTO habit_schedules (habitId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [newId, i, startM, endM]
              );
            } else {
              await db.runAsync(
                `INSERT INTO habit_schedules (habitId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [newId, i, startM, 1440]
              );

              await db.runAsync(
                `INSERT INTO habit_schedules (habitId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [newId, (i + 1) % 7, 0, endM]
              );
            }
          }
        }
      } else {
        if (!existing?.id) throw new Error("Missing habit id for update.");

        await db.runAsync(
          `UPDATE habits SET
              title=?
            WHERE id=?`,
          [habitName.trim(), existing.id]
        );

        await db.runAsync(`DELETE FROM habit_schedules WHERE habitId=?`, [
          existing.id,
        ]);

        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            if (startM < endM) {
              await db.runAsync(
                `INSERT INTO habit_schedules (habitId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [existing.id, i, startM, endM]
              );
            } else {
              await db.runAsync(
                `INSERT INTO habit_schedules (habitId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [existing.id, i, startM, 1440]
              );

              await db.runAsync(
                `INSERT INTO habit_schedules (habitId, day, start_minutes, end_minutes) VALUES (?, ?, ?, ?);`,
                [existing.id, (i + 1) % 7, 0, endM]
              );
            }
          }
        }
      }

      //REBALANCE
      // await rebalance(db, "habit");

      await db.runAsync("COMMIT");

      console.log("Habit saved successfully.");
      navigation.goBack();
    } catch (err) {
      await db.runAsync("ROLLBACK");
      // console.error("validateAndSave (habit) error:", err);
      Alert.alert(
        "Save Failed",
        err?.message || "Something went wrong while saving the habit."
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.topText}>
          <Text style={styles.title}>
            {mode === "edit" ? "Edit Habit" : "Add Habit"}
          </Text>
          <Text style={styles.subtitle}>Set up your habit flow.</Text>
        </View>

        {/* HABIT NAME */}
        <View style={styles.section}>
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter habit name"
            placeholderTextColor="#999"
            value={habitName}
            onChangeText={setHabitName}
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

/* ----------------------------- STYLES ----------------------------- */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  container: { padding: 20 },
  topText: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#333" },
  subtitle: { marginTop: 6, color: "#666" },
  section: { marginTop: 18 },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 8 },
  input: {
    backgroundColor: "#F7F7FF",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    color: "#333",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleText: { fontSize: 14, color: "#444", flex: 1, fontWeight: "600" },

  timeRow: { flexDirection: "row", gap: 12 },
  timeCard: {
    flex: 1,
    backgroundColor: "#FFF",
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
  timeSmall: { fontSize: 12, color: "#777" },
  timeLarge: { marginTop: 6, fontSize: 18, fontWeight: "700", color: "#333" },

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

  dayText: { fontSize: 14, fontWeight: "600", color: "#333" },

  footer: { marginTop: 28 },
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

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#FFF",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },

  modalItem: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  modalItemText: { fontSize: 18, color: "#333" },

  modalClose: {
    marginTop: 10,
    backgroundColor: "#EEE",
    padding: 12,
    borderRadius: 12,
  },

  modalCloseText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});
