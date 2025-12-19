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
  const [startTime, setStartTime] = useState(
    existing.startTime ?? new Date(new Date().setHours(9, 0, 0, 0))
  );
  const [endTime, setEndTime] = useState(
    existing.endTime ?? new Date(new Date().setHours(17, 0, 0, 0))
  );
  const [activePicker, setActivePicker] = useState(null); // "start" or "end"
  const [showTimePicker, setShowTimePicker] = useState(false);
  // days: array of booleans [Mon..Sun]
  const [days, setDays] = useState(existing.days ?? Array(7).fill(false));

  const toggleDay = (index) => {
    // const i = (index + 1) % 7;
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

  const groupBusyBlocks = (rows) => {
    const grouped = {};
    rows.forEach((row) => {
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
      if (row.day) grouped[key].days.push(row.day);
    });

    return Object.values(grouped);
  };

  const findConflict = ({ items, startM, endM }) => {
    for (let item of items) {
      // Skip self when editing habit
      if (
        mode === "edit" &&
        item.type === "routine" &&
        item.id === existing?.id
      ) {
        continue;
      }

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

      const startM = startTime.getHours() * 60 + startTime.getMinutes();
      const endM = endTime.getHours() * 60 + endTime.getMinutes();

      // --- LOAD ALL BUSY BLOCKS ---
      const blocks = await db.getAllAsync(`
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

        UNION ALL

        SELECT
          ts.start_minutes AS start_minutes,
          ts.end_minutes AS end_minutes,
          CAST(strftime('%w', ts.date) AS INTEGER) AS day,
          'task' AS type,
          t.id AS itemId,
          t.title AS title
        FROM task_schedules ts
        JOIN tasks t ON ts.taskId = t.id
        WHERE t.is_auto = 0;
      `);

      const busyItems = groupBusyBlocks(blocks);

      // --- CHECK CONFLICT ---

      const conflict = findConflict({ items: busyItems, startM, endM });
      if (conflict) {
        return Alert.alert(
          "Time Conflict",
          `This habit overlaps with ${conflict.type}: "${conflict.title}".`
        );
      }

      // --- SAVE ROUTINE ---
      if (mode === "add") {
        const result = await db.runAsync(
          `INSERT INTO routines 
        (title, start_time, end_time, start_minutes, end_minutes)
       VALUES (?, ?, ?, ?, ?);`,
          [
            label.trim(),
            startTime.toISOString(),
            endTime.toISOString(),
            startM,
            endM,
          ]
        );
        const newId = result.lastInsertRowId;

        if (!newId) {
          throw new Error("Insert succeeded but couldn't read new row id.");
        }

        // insert days
        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            await db.runAsync(
              `INSERT INTO routine_days (routineId, day) VALUES (?, ?);`,
              [newId, i]
            );
          }
        }
      } else {
        // update routine
        if (!existing?.id) throw new Error("Missing routine id for update.");
        await db.runAsync(
          `UPDATE routines SET 
        title=?, start_time=?, end_time=?, start_minutes=?, end_minutes=?
       WHERE id=?`,
          [
            label.trim(),
            startTime.toISOString(),
            endTime.toISOString(),
            startM,
            endM,
            existing.id,
          ]
        );

        // delete old days
        await db.runAsync(`DELETE FROM routine_days WHERE routineId=?`, [
          existing.id,
        ]);

        // insert new days
        for (let i = 0; i < days.length; i++) {
          if (days[i]) {
            await db.runAsync(
              `INSERT INTO routine_days (routineId, day) VALUES (?, ?);`,
              [existing.id, i]
            );
          }
        }
      }
      console.log("Routine saved successfully.");
      navigation.goBack();
    } catch (err) {
      // catch ANY error and show informative message

      console.error("validateAndSave error:", err);

      const message =
        (err && err.message) ||
        "An unknown error occurred while saving. Check console for details.";

      Alert.alert("Save failed", message);
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
