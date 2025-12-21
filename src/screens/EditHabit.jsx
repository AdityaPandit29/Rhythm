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

  // const [startTime, setStartTime] = useState(
  //   existing.startTime ?? new Date(new Date().setHours(18, 0, 0, 0))
  // );
  // const [endTime, setEndTime] = useState(
  //   existing.endTime ?? new Date(new Date().setHours(19, 0, 0, 0))
  // );

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

  const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => {
    const check = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

    const aCross = aStart > aEnd; // crosses midnight
    const bCross = bStart > bEnd; // crosses midnight

    if (!aCross && !bCross) {
      return check(aStart, aEnd, bStart, bEnd);
    }

    if (aCross && bCross) {
      return true; // both span midnight → guaranteed overlap
    }

    if (aCross) {
      return check(aStart, 1440, bStart, bEnd) || check(0, aEnd, bStart, bEnd);
    }

    if (bCross) {
      return check(aStart, aEnd, bStart, 1440) || check(aStart, aEnd, 0, bEnd);
    }
  };

  const groupBusyBlocks = (recurring, tasks) => {
    const grouped = {};

    recurring.forEach((row) => {
      const key = `${row.type}-${row.itemId}`;

      if (!grouped[key]) {
        grouped[key] = {
          type: row.type,
          id: row.itemId,
          title: row.title,
          start_minutes: row.start_minutes,
          end_minutes: row.end_minutes,
          days: [],
        };
      }

      if (!grouped[key].days.includes(row.day)) {
        grouped[key].days.push(row.day);
      }
    });

    tasks.forEach((row) => {
      const key = `${row.type}-${row.itemId}`;

      if (!grouped[key]) {
        grouped[key] = {
          type: row.type,
          id: row.itemId,
          title: row.title,
          start_minutes: [],
          end_minutes: [],
          dates: [],
        };
      }

      grouped[key].dates.push(row.date);
      grouped[key].start_minutes.push(row.start_minutes);
      grouped[key].end_minutes.push(row.end_minutes);
    });

    return Object.values(grouped);
  };

  const findConflict = ({ items, startM, endM }) => {
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
          const weekday = new Date(
            item.dates[i].split("/").reverse().join("-")
          ).getDay();

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
        const shareDay = item.days.some((dayIndex) => days[dayIndex]);
        if (!shareDay) continue;

        if (
          intervalsOverlap(startM, endM, item.start_minutes, item.end_minutes)
        ) {
          return {
            type: item.type,
            title: item.title,
          };
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

      const startM = startMinutes;
      const endM = endMinutes;

      /* ---------- LOAD ALL BUSY BLOCKS ---------- */
      const routinesAndHabits = await db.getAllAsync(`
        SELECT 
          r.start_minutes AS start_minutes,
          r.end_minutes AS end_minutes,
          d.day AS day,
          'routine' AS type,
          r.id AS itemId,
          r.title AS title
        FROM routines r
        LEFT JOIN routine_days d ON r.id = d.routineId

        UNION ALL

        SELECT 
          h.start_minutes AS start_minutes,
          h.end_minutes AS end_minutes,
          hd.day AS day,
          'habit' AS type,
          h.id AS itemId,
          h.title AS title
        FROM habits h
        LEFT JOIN habit_days hd ON h.id = hd.habitId
      `);

      const manualTasks = await db.getAllAsync(`
        SELECT
          ts.start_minutes AS start_minutes,
          ts.end_minutes AS end_minutes,
          ts.date AS date,
          'task' AS type,
          t.id AS itemId,
          t.title AS title
        FROM task_schedules ts
        LEFT JOIN tasks t ON ts.taskId = t.id
        WHERE t.is_auto = 0;
      `);

      const busyItems = groupBusyBlocks(routinesAndHabits, manualTasks);

      /* ---------- CONFLICT CHECK ---------- */
      const conflict = findConflict({ items: busyItems, startM, endM });
      if (conflict) {
        return Alert.alert(
          "Time Conflict",
          `This habit overlaps with ${conflict.type}: "${conflict.title}".`
        );
      }

      /* ---------- SAVE HABIT ---------- */
      if (mode === "add") {
        const result = await db.runAsync(
          `INSERT INTO habits
            (title, start_minutes, end_minutes)
            VALUES (?, ?, ?)`,
          [habitName.trim(), startM, endM]
        );

        const newId = result.lastInsertRowId;
        if (!newId)
          throw new Error("Insert succeeded but couldn't read new row id.");

        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            await db.runAsync(
              `INSERT INTO habit_days (habitId, day) VALUES (?, ?)`,
              [newId, i]
            );
          }
        }
      } else {
        if (!existing?.id) throw new Error("Missing habit id for update.");

        await db.runAsync(
          `UPDATE habits SET
              title=?, start_minutes=?, end_minutes=?
            WHERE id=?`,
          [habitName.trim(), startM, endM, existing.id]
        );

        await db.runAsync(`DELETE FROM habit_days WHERE habitId=?`, [
          existing.id,
        ]);

        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            await db.runAsync(
              `INSERT INTO habit_days (habitId, day) VALUES (?, ?)`,
              [existing.id, i]
            );
          }
        }
      }

      console.log("Habit saved successfully.");
      navigation.goBack();
    } catch (err) {
      console.error("validateAndSave (habit) error:", err);
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
