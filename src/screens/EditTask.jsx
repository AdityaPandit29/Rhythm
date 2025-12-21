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
  Modal,
  FlatList,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

export default function EditTask() {
  const db = useSQLiteContext();

  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const mode = params.mode === "edit" ? "edit" : "add";
  const existing = params.task || {};

  const priorityColors = {
    High: "#FF5555",
    Low: "#4CAF50",
  };

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

  /* ------------------------- STATES ------------------------- */
  const [taskName, setTaskName] = useState(existing.taskName ?? "");
  const [priority, setPriority] = useState(existing.priority ?? "Low");
  const [isAuto, setIsAuto] = useState((existing.isAuto ?? 1) === 0); // false
  const [deadline, setDeadline] = useState(
    existing.deadline ?? new Date(new Date().setHours(23, 59, 0, 0))
  );

  const [date, setDate] = useState(
    existing.date ?? new Date(new Date().setHours(0, 0, 0, 0))
  );
  // console.log(date);

  const duration = existing?.durationLeft ?? 0;

  const [selectedHours, setSelectedHours] = useState(Math.floor(duration / 60));

  const [selectedMinutes, setSelectedMinutes] = useState(duration % 60);

  const [startTime, setStartTime] = useState(
    existing?.start_minutes
      ? minutesToDate(existing.start_minutes)
      : minutesToDate(540)
  );
  const [endTime, setEndTime] = useState(
    existing?.end_minutes
      ? minutesToDate(existing.end_minutes)
      : minutesToDate(600)
  );

  const [activeTimePicker, setActiveTimePicker] = useState(null);
  const [activeDatePicker, setActiveDatePicker] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showHourModal, setShowHourModal] = useState(false);
  const [showMinuteModal, setShowMinuteModal] = useState(false);

  /* ------------------------- FUNCTIONS ------------------------- */

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (activeDatePicker === "deadline") {
      const updated = new Date(deadline);
      updated.setFullYear(selectedDate.getFullYear());
      updated.setMonth(selectedDate.getMonth());
      updated.setDate(selectedDate.getDate());
      setDeadline(updated);
    } else {
      const updated = new Date(date);
      updated.setFullYear(selectedDate.getFullYear());
      updated.setMonth(selectedDate.getMonth());
      updated.setDate(selectedDate.getDate());
      setDate(updated);
    }
  };

  const formatDate = (date) => {
    const currentYear = new Date().getFullYear();
    const selectedYear = date.getFullYear();

    // If same year → don't show year
    if (selectedYear === currentYear) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    // If different year → show full date with year
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (!selectedTime) return;

    if (activeTimePicker === "start") {
      setStartTime(selectedTime);
    } else if (activeTimePicker === "end") {
      setEndTime(selectedTime);
    } else {
      const updated = new Date(deadline);
      updated.setHours(selectedTime.getHours());
      updated.setMinutes(selectedTime.getMinutes());
      setDeadline(updated);
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

  const findConflict = ({ items, date, startM, endM, skip = null }) => {
    const dateString = date.toISOString().split("T")[0];
    const day = date.getDay();

    for (let item of items) {
      if (skip && item.type === skip.type && item.id === skip.id) continue;

      // ---------- DAY / DATE CHECK ----------
      if (item.type === "task") {
        for (let i = 0; i < item.dates.length; i++) {
          if (item.dates[i] === dateString) {
            if (
              intervalsOverlap(
                startM,
                endM,
                item.start_minutes[i],
                item.end_minutes[i]
              )
            ) {
              return {
                type: item.type,
                title: item.title,
              };
            }
          }
        }
      } else {
        if (item.days.includes(day)) {
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
    }

    return null;
  };

  const groupBusyBlocks = (rows) => {
    const grouped = {};

    rows.forEach((row) => {
      const key = `${row.type}-${row.itemId}`;

      if (!grouped[key]) {
        if (row.type === "task") {
          grouped[key] = {
            type: row.type,
            id: row.itemId,
            title: row.title,
            start_minutes: [],
            end_minutes: [],
            dates: [],
          };
        } else {
          grouped[key] = {
            type: row.type,
            id: row.itemId,
            title: row.title,
            start_minutes: row.start_minutes,
            end_minutes: row.end_minutes,
            days: [],
          };
        }
      }

      if (row.day !== undefined && row.day !== null) {
        if (!grouped[key].days.includes(row.day)) {
          grouped[key].days.push(row.day);
        }
      }
      if (row.date) {
        grouped[key].dates.push(row.date);
        grouped[key].start_minutes.push(row.start_minutes);
        grouped[key].end_minutes.push(row.end_minutes);
      }
    });

    return Object.values(grouped);
  };

  const validateAndSave = async () => {
    try {
      /* ---------- BASIC VALIDATION ---------- */
      if (!taskName.trim()) {
        return Alert.alert("Missing Title", "Please enter a task title.");
      }

      /* ---------- LOAD ALL BLOCKS ---------- */
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
          ts.date AS date,
          'task' AS type,
          t.id AS itemId,
          t.title AS title
        FROM task_schedules ts
        JOIN tasks t ON ts.taskId = t.id
        WHERE t.is_auto = 0;

      `);

      const busyItems = groupBusyBlocks(blocks);

      /* ---------- AUTO TASK ---------- */

      if (isAuto) {
        if (totalMinutes === 0) {
          // quick task → skip scheduling, BUT DO NOT RETURN
        }

        /* ---------- DEADLINE VALIDATION ---------- */
        const deadlineDate = new Date(deadline);

        // Deadline date is before today (ignore time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadlineDay = new Date(deadlineDate);
        deadlineDay.setHours(0, 0, 0, 0);

        if (deadlineDay < today) {
          return Alert.alert(
            "Invalid Deadline",
            "Deadline cannot be in the past."
          );
        }

        const totalMinutes = selectedHours * 60 + selectedMinutes;
        // 1. compute free slots from busyItems
        // 2. allocate
        // 3. DO NOT check conflicts manually
        return Alert.alert(
          "Auto Scheduling",
          "Auto scheduling will be available soon."
        );
      } else {
        const now = new Date();

        // Today at 00:00
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Selected date at 00:00
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);

        // Date validation
        if (startDate < today) {
          return Alert.alert("Invalid Date", "Date cannot be in the past.");
        }

        // Time validation (only if date is today)
        if (startDate.getTime() === today.getTime()) {
          if (startTime.getTime() <= now.getTime()) {
            return Alert.alert(
              "Invalid Time",
              "Time must be later than the current time."
            );
          }
        }
        /* ---------- MANUAL TASK ---------- */
        let startM = startTime.getHours() * 60 + startTime.getMinutes();
        let endM = endTime.getHours() * 60 + endTime.getMinutes();
        let selectedDate = date;

        if (startM === endM) {
          return Alert.alert(
            "Invalid Time",
            "End time must be differ from start time."
          );
        }

        /* ---------- CHECK CONFLICT ---------- */

        const conflict = findConflict({
          items: busyItems,
          date: selectedDate,
          startM: startM,
          endM: endM,
          skip:
            mode === "edit" && item.type === "task" && item.id === existing?.id,
        });

        if (conflict) {
          return Alert.alert(
            "Time Conflict",
            `This task overlaps with ${conflict.type}: "${conflict.title}".`
          );
        }

        /* ---------- SAVE TASK ---------- */
        let taskId;

        if (mode === "add") {
          const res = await db.runAsync(
            `INSERT INTO tasks
         (title, priority, is_auto, deadline, total_duration, duration_left, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              taskName.trim(),
              null,
              0,
              null,
              null,
              null,
              new Date().toISOString(),
            ]
          );
          taskId = res.lastInsertRowId;
        } else {
          taskId = existing.id;

          await db.runAsync(
            `UPDATE tasks SET
          title=?, priority=?, is_auto=?, deadline=?, total_duration=?, duration_left=?
         WHERE id=?`,
            [taskName.trim(), null, 0, null, null, null, taskId]
          );

          await db.runAsync(`DELETE FROM task_schedules WHERE taskId=?`, [
            taskId,
          ]);
        }

        /* ---------- INSERT MANUAL SCHEDULES ---------- */
        if (endM <= startM) {
          await db.runAsync(
            `INSERT INTO task_schedules
          (taskId, date, start_minutes, end_minutes, duration)
          VALUES (?, ?, ?, ?, ?)`,
            [
              taskId,
              selectedDate.toLocaleDateString().split("T")[0],
              startM,
              1440,
              1440 - startM,
            ]
          );

          const nextDate = new Date(selectedDate);
          nextDate.setDate(nextDate.getDate() + 1);

          await db.runAsync(
            `INSERT INTO task_schedules
          (taskId, date, start_minutes, end_minutes, duration)
          VALUES (?, ?, ?, ?, ?)`,
            [taskId, nextDate.toLocaleDateString().split("T")[0], 0, endM, endM]
          );
        } else {
          await db.runAsync(
            `INSERT INTO task_schedules
          (taskId, date, start_minutes, end_minutes, duration)
          VALUES (?, ?, ?, ?, ?)`,
            [
              taskId,
              selectedDate.toLocaleDateString().split("T")[0],
              startM,
              endM,
              endM - startM,
            ]
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      console.error("validateAndSave (task) error:", err);
      Alert.alert(
        "Save Failed",
        err?.message || "Something went wrong while saving the habit."
      );
    }
  };

  /* ---------------------- RENDER HELPERS ----------------------- */

  const renderPickerModal = (visible, setVisible, data, onSelect) => (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select</Text>

          <FlatList
            data={data}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.modalItem,
                  pressed && { backgroundColor: "#F7F7FF" },
                ]}
                onPress={() => {
                  onSelect(item);
                  setVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </Pressable>
            )}
          />

          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setVisible(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.topText}>
          <Text style={styles.title}>
            {mode === "edit" ? "Edit Task" : "Add Task"}
          </Text>
          <Text style={styles.subtitle}>Tune your task settings.</Text>
        </View>

        {/* TASK NAME */}
        <View style={styles.section}>
          <Text style={styles.label}>Task Name</Text>
          <TextInput
            value={taskName}
            style={styles.input}
            placeholder="Enter task name"
            placeholderTextColor="#999"
            onChangeText={setTaskName}
          />
        </View>

        {/* MONTHLY TOGGLE */}
        {/* <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Repeat Monthly</Text>
            <Switch
              value={isMonthly}
              onValueChange={setIsMonthly}
              trackColor={{ false: "#ccc", true: "#6C63FF" }}
              thumbColor="#fff"
            />
          </View>
        </View> */}

        {/* AUTO-SCHEDULE TOGGLE */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              Auto-schedule the best time for this task
            </Text>
            <Switch
              value={isAuto}
              onValueChange={setIsAuto}
              trackColor={{ false: "#ccc", true: "#6C63FF" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {isAuto ? (
          <>
            {/* PRIORITY */}
            <View style={styles.section}>
              <Text style={styles.label}>Priority</Text>

              <View style={styles.typeRow}>
                {/* HIGH */}
                <Pressable
                  style={[
                    styles.typeOption,
                    priority === "High" && { backgroundColor: "#6C63FF" },
                  ]}
                  onPress={() => setPriority("High")}
                >
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: priorityColors["High"] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      priority === "High" && { color: "white" },
                    ]}
                  >
                    High
                  </Text>
                </Pressable>

                {/* LOW */}
                <Pressable
                  style={[
                    styles.typeOption,
                    priority === "Low" && { backgroundColor: "#6C63FF" },
                  ]}
                  onPress={() => setPriority("Low")}
                >
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: priorityColors["Low"] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      priority === "Low" && { color: "white" },
                    ]}
                  >
                    Low
                  </Text>
                </Pressable>

                {/* MEDIUM
            <Pressable
              style={[
                styles.typeOption,
                priority === "Medium" && { backgroundColor: "#6C63FF" },
              ]}
              onPress={() => setPriority("Medium")}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColors["Medium"] },
                ]}
              />
              <Text
                style={[
                  styles.typeText,
                  priority === "Medium" && { color: "white" },
                ]}
              >
                Medium
              </Text>
            </Pressable> */}
              </View>
            </View>

            {/* DEADLINE */}
            <View style={styles.section}>
              <Text style={styles.label}>Deadline</Text>
              <View style={styles.timeRow}>
                {/* DATE PICKER */}
                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => {
                    setActiveDatePicker("deadline");
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.timeSmall}>Date</Text>
                  <Text style={styles.timeLarge}>{formatDate(deadline)}</Text>
                </TouchableOpacity>

                {/* TIME PICKER */}
                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => {
                    setActiveTimePicker("deadline");
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.timeSmall}>Time</Text>
                  <Text style={styles.timeLarge}>
                    {deadline.toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* IF AUTO-SCHEDULE ON → SHOW DURATION INPUTS */}
            {/* DURATION */}
            <View style={styles.section}>
              <Text style={styles.label}>Approx. Duration</Text>

              <View style={styles.timeRow}>
                {/* HOURS */}
                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => setShowHourModal(true)}
                >
                  <Text style={styles.timeSmall}>Hours</Text>
                  <Text style={styles.timeLarge}>{selectedHours} h</Text>
                </TouchableOpacity>

                {/* MINUTES */}
                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => setShowMinuteModal(true)}
                >
                  <Text style={styles.timeSmall}>Minutes</Text>
                  <Text style={styles.timeLarge}>{selectedMinutes} min</Text>
                </TouchableOpacity>
              </View>
              {/* INFO IF DURATION = 0 */}
              {/* 👉 Show conditionally if duration = 0 */}
              {/* <Text style={{ marginTop: 8, color: "#777", fontSize: 12 }}>
            Rhythm will place this task in any free time.
          </Text> */}
            </View>
          </>
        ) : (
          <>
            {/* DATE PICKER */}
            <View style={styles.section}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.timeCard}
                onPress={() => {
                  setActiveDatePicker("date");
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.timeLarge}>{formatDate(date)}</Text>
              </TouchableOpacity>
            </View>
            {/* MANUAL TIME SELECTOR (ONLY IF AUTO-SCHEDULE OFF) */}
            {/* Time */}
            <View style={styles.section}>
              <Text style={styles.label}>Time</Text>

              <View style={styles.timeRow}>
                {/* Start Time */}
                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => {
                    setActiveTimePicker("start");
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.timeSmall}>Start</Text>
                  <Text style={styles.timeLarge}>
                    {startTime.toLocaleTimeString("en-IN", {
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
                    setActiveTimePicker("end");
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.timeSmall}>End</Text>
                  <Text style={styles.timeLarge}>
                    {endTime.toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* DATE PICKER MODAL */}
        {showDatePicker && (
          <DateTimePicker
            value={activeDatePicker === "deadline" ? deadline : date}
            mode="date"
            display="spinner"
            onChange={onChangeDate}
          />
        )}
        {/* TIME PICKER MODAL */}
        {showTimePicker && (
          <DateTimePicker
            value={
              activeTimePicker === "start"
                ? startTime
                : activeTimePicker === "end"
                ? endTime
                : deadline
            }
            mode="time"
            display="spinner"
            onChange={onChangeTime}
          />
        )}

        {/* SAVE BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={validateAndSave}>
            <Text style={styles.saveBtnText}>Save Task</Text>
          </TouchableOpacity>
        </View>

        {/* MODALS */}
        {renderPickerModal(
          showHourModal,
          setShowHourModal,
          [...Array(13).keys()], // 0–12 hours
          setSelectedHours
        )}

        {renderPickerModal(
          showMinuteModal,
          setShowMinuteModal,
          [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
          setSelectedMinutes
        )}
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

  /* TYPE/PRIORITY OPTIONS */
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
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
