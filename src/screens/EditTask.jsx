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
    Medium: "#F7B801",
    Low: "#4CAF50",
  };

  /* ------------------------- STATES ------------------------- */
  const [taskName, setTaskName] = useState(existing.taskName ?? "");
  // const [isMonthly, setIsMonthly] = useState(existing.isMonthly ?? false);
  const [priority, setPriority] = useState(existing.priority ?? "Medium");
  const [isAuto, setIsAuto] = useState((existing.isAuto ?? 1) === 1);
  const [deadline, setDeadline] = useState(
    existing.deadline ?? new Date(new Date().setHours(23, 59, 0, 0))
  );

  const duration = existing?.durationLeft ?? 0;

  const [selectedHours, setSelectedHours] = useState(Math.floor(duration / 60));

  const [selectedMinutes, setSelectedMinutes] = useState(duration % 60);

  const [startTime, setStartTime] = useState(
    existing.startTime ?? new Date(new Date().setHours(9, 0, 0, 0))
  );
  const [endTime, setEndTime] = useState(
    existing.endTime ?? new Date(new Date().setHours(10, 0, 0, 0))
  );

  const [activePicker, setActivePicker] = useState(null); // "start" or "end"

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showHourModal, setShowHourModal] = useState(false);
  const [showMinuteModal, setShowMinuteModal] = useState(false);

  /* ------------------------- FUNCTIONS ------------------------- */

  const onChangeDeadlineDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const updated = new Date(deadline);
      updated.setFullYear(selectedDate.getFullYear());
      updated.setMonth(selectedDate.getMonth());
      updated.setDate(selectedDate.getDate());
      setDeadline(updated);
    }
  };

  const formatDeadlineDate = (date) => {
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

    if (activePicker === "start") {
      setStartTime(selectedTime);
    } else if (activePicker === "end") {
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

  const findConflict = ({
    items,
    selectedDays, // boolean[7] (0 = Sun)
    startM,
    endM,
    skip = null,
  }) => {
    for (let item of items) {
      if (skip && item.type === skip.type && item.id === skip.id) continue;

      /* ---------- DAY CHECK ---------- */
      const dayOverlap = item.days.some((dayIndex) => selectedDays[dayIndex]);

      if (!dayOverlap) continue;

      /* ---------- TIME CHECK ---------- */
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

      if (row.day !== null && row.day !== undefined) {
        if (!grouped[key].days.includes(row.day)) {
          grouped[key].days.push(row.day);
        }
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

      /* ---------- MANUAL TASK TIME CHECK ---------- */
      if (!isAuto && deadlineDay.getTime() === today.getTime()) {
        const now = new Date();
        const end = new Date(endTime);

        if (end <= now) {
          return Alert.alert(
            "Invalid End Time",
            "End time must be later than the current time."
          );
        }
      }

      const totalMinutes = selectedHours * 60 + selectedMinutes;
      console.log(totalMinutes);
      console.log(isAuto);

      let startM = null;
      let endM = null;
      let finalStart = null;
      let finalEnd = null;

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
        WHERE h.is_auto = 0

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

      /* ---------- AUTO TASK ---------- */

      if (isAuto && totalMinutes === 0) {
        // quick task → skip scheduling, BUT DO NOT RETURN
      } else if (isAuto) {
        // 1. compute free slots from busyItems
        // 2. allocate
        // 3. DO NOT check conflicts manually
        return Alert.alert(
          "Auto Scheduling",
          "Auto scheduling will be available soon."
        );
      } else {
        /* ---------- MANUAL TASK ---------- */
        startM = startTime.getHours() * 60 + startTime.getMinutes();
        endM = endTime.getHours() * 60 + endTime.getMinutes();

        const duration = (endM - startM + 1440) % 1440;

        if (duration === 0) {
          return Alert.alert(
            "Invalid Time",
            "End time must be differ from start time."
          );
        }

        finalStart = startTime;
        finalEnd = endTime;

        /* ---------- CHECK CONFLICT ---------- */

        // index: 0 = Sun ... 6 = Sat
        const now = new Date();

        let startDate = new Date();
        let endDate = new Date(deadline);

        startDate.setHours(
          finalStart.getHours(),
          finalStart.getMinutes(),
          0,
          0
        );

        endDate.setHours(finalEnd.getHours(), finalEnd.getMinutes(), 0, 0);

        // if today's slot already passed → start tomorrow
        if (startDate <= now) {
          startDate.setDate(startDate.getDate() + 1);
        }

        // if the time slot is after the deadline then end one day before
        if (endDate > deadline) {
          endDate.setDate(endDate.getDate() - 1);
        }
        const selectedDays = Array(7).fill(false);

        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          selectedDays[d.getDay()] = true;
        }

        const conflict = findConflict({
          items: busyItems,
          selectedDays, // derived from date range or weekday
          startM,
          endM,
          skip: mode === "edit" ? { type: "task", id: existing.id } : null,
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
              priority,
              0,
              deadline?.toISOString(),
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
            [
              taskName.trim(),
              priority,
              0,
              deadline?.toISOString(),
              null,
              null,
              taskId,
            ]
          );

          await db.runAsync(`DELETE FROM task_schedules WHERE taskId=?`, [
            taskId,
          ]);
        }

        /* ---------- INSERT MANUAL SCHEDULES ---------- */
        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          await db.runAsync(
            `INSERT INTO task_schedules
          (taskId, date, start_time, end_time, start_minutes, end_minutes)
          VALUES (?, ?, ?, ?, ?, ?)`,
            [
              taskId,
              d.toISOString().split("T")[0],
              finalStart.toISOString(),
              finalEnd.toISOString(),
              startM,
              endM,
            ]
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      console.error("validateAndSave (habit) error:", err);
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

        {/* PRIORITY */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>

          <View style={styles.typeRow}>
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

            {/* MEDIUM */}
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
            </Pressable>

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
          </View>
        </View>

        {/* DEADLINE */}
        <View style={styles.section}>
          <Text style={styles.label}>Deadline</Text>
          <View style={styles.timeRow}>
            {/* DATE PICKER */}
            <TouchableOpacity
              style={styles.timeCard}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.timeSmall}>Date</Text>
              <Text style={styles.timeLarge}>
                {formatDeadlineDate(deadline)}
              </Text>
            </TouchableOpacity>

            {/* TIME PICKER */}
            <TouchableOpacity
              style={styles.timeCard}
              onPress={() => {
                setActivePicker("deadline");
                setShowTimePicker(true);
              }}
            >
              <Text style={styles.timeSmall}>Time</Text>
              <Text style={styles.timeLarge}>
                {deadline.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
            {/* IF AUTO-SCHEDULE ON → SHOW DURATION INPUTS */}
            {/* DURATION */}
            <View style={styles.section}>
              <Text style={styles.label}>Duration</Text>

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
            {/* MANUAL TIME SELECTOR (ONLY IF AUTO-SCHEDULE OFF) */}
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
          </>
        )}

        {/* DATE PICKER MODAL */}
        {showDatePicker && (
          <DateTimePicker
            value={deadline}
            mode="date"
            display="spinner"
            onChange={onChangeDeadlineDate}
          />
        )}
        {/* TIME PICKER MODAL */}
        {showTimePicker && (
          <DateTimePicker
            value={
              activePicker === "start"
                ? startTime
                : activePicker === "end"
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
