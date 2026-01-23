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
import {
  groupBusyBlocks,
  intervalsOverlap,
  computeAuthority,
  buildCalendar,
  autoSchedule,
  MAX_LOOKAHEAD_DAYS,
  loadManualBlocks,
  rebalance,
  cleanupExpiredTasks,
} from "../utils/scheduling.js";

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

  const DURATION_OPTIONS = [
    { label: "Quick", minutes: 0 },
    { label: "30 min", minutes: 30 },
    { label: "1 hr", minutes: 60 },
    { label: "1 hr 30 min", minutes: 90 },
    { label: "2 hr", minutes: 120 },
    { label: "2 hr 30 min", minutes: 150 },
    { label: "3 hr", minutes: 180 },
  ];

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

  /* ------------------------- STATES ------------------------- */
  const [taskName, setTaskName] = useState(existing?.taskName ?? "");
  const [priority, setPriority] = useState(existing?.priority ?? "Low");
  const [isAuto, setIsAuto] = useState((existing?.isAuto ?? 1) === 1); // false
  const [deadlineDate, setDeadlineDate] = useState(
    existing?.deadlineDate
      ? new Date(existing.deadlineDate)
      : new Date(new Date().setHours(0, 0, 0, 0)),
  );

  const [deadlineMinutes, setDeadlineMinutes] = useState(
    existing?.deadlineMinutes ?? 1439,
  );

  const [date, setDate] = useState(
    existing?.scheduledDate
      ? new Date(existing.scheduledDate)
      : new Date(new Date().setHours(0, 0, 0, 0)),
  );

  const duration = existing?.durationLeft ?? 0;

  // const [selectedHours, setSelectedHours] = useState(Math.floor(duration / 60));

  // const [selectedMinutes, setSelectedMinutes] = useState(duration % 60);
  const [durationMinutes, setDurationMinutes] = useState(
    existing?.totalDuration ?? 30,
  );

  const [startMinutes, setStartMinutes] = useState(
    existing?.startMinutes ?? 1080,
  );
  const [endMinutes, setEndMinutes] = useState(existing?.endMinutes ?? 1140);

  const [activeTimePicker, setActiveTimePicker] = useState(null);
  const [activeDatePicker, setActiveDatePicker] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showHourModal, setShowHourModal] = useState(false);
  const [showMinuteModal, setShowMinuteModal] = useState(false);

  /* ------------------------- FUNCTIONS ------------------------- */

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (activeDatePicker === "deadlineDate") {
      const updated = new Date(deadlineDate);
      updated.setFullYear(selectedDate.getFullYear());
      updated.setMonth(selectedDate.getMonth());
      updated.setDate(selectedDate.getDate());
      setDeadlineDate(updated);
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

    const minutes = selectedTime.getHours() * 60 + selectedTime.getMinutes();

    if (activeTimePicker === "start") {
      setStartMinutes(minutes);
    } else if (activeTimePicker === "end") {
      setEndMinutes(minutes);
    } else {
      setDeadlineMinutes(minutes);
    }
  };

  const buildIntervalsFromSelection = (date, startM, endM) => {
    const curDateString = date.toLocaleDateString("sv-SE");
    const curDay = date.getDay();

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateString = nextDate.toLocaleDateString("sv-SE");
    const nextDay = nextDate.getDay();
    const intervals = [];

    if (startM < endM) {
      // Normal same-day routine
      intervals.push({
        date: curDateString,
        day: curDay,
        start: startM,
        end: endM,
      });
    } else {
      // Overnight routine → split
      intervals.push({
        date: curDateString,
        day: curDay,
        start: startM,
        end: 1440,
      });
      intervals.push({
        date: nextDateString,
        day: nextDay,
        start: 0,
        end: endM,
      });
    }

    return intervals;
  };

  const findConflict = ({ items, date, startM, endM }) => {
    const newIntervals = buildIntervalsFromSelection(date, startM, endM);

    for (let item of items) {
      if (mode === "edit" && item.type === "task" && item.id === existing?.id)
        continue;

      // ---------- DAY / DATE CHECK ----------
      if (item.type === "task") {
        for (const ni of newIntervals) {
          // new intervals
          for (const ei of item.intervals) {
            // existing intervals

            if (ni.date !== ei.date) continue;

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
          // new intervals
          for (const ei of item.intervals) {
            // existing intervals

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
      if (!taskName.trim()) {
        return Alert.alert("Missing Title", "Please enter a task title.");
      }

      await cleanupExpiredTasks(db);

      const blocks = await loadManualBlocks(db);
      const busyItems = groupBusyBlocks(blocks);

      if (isAuto) {
        /* ---------- DEADLINE VALIDATION ---------- */

        // Deadline date is before today (ignore time)
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadlineDay = new Date(deadlineDate);
        deadlineDay.setHours(0, 0, 0, 0);

        // Combine deadline date + time
        const deadlineFull = new Date(deadlineDate);
        deadlineFull.setHours(0, 0, 0, 0);
        deadlineFull.setMinutes(deadlineMinutes);
        const maxEnd = new Date(today);
        maxEnd.setDate(maxEnd.getDate() + MAX_LOOKAHEAD_DAYS);

        if (
          deadlineDay < today ||
          (deadlineDay.getTime() === today.getTime() && deadlineFull < now)
        ) {
          return Alert.alert(
            "Invalid Deadline",
            "Deadline cannot be in the past.",
          );
        }
        if (deadlineDay >= maxEnd) {
          return Alert.alert(
            "Invalid Deadline",
            `Please select deadline before ${formatDate(maxEnd)}.`,
          );
        }
        const totalMinutes = durationMinutes;

        if (totalMinutes === 0) {
          if (mode === "add") {
            await db.runAsync(
              `INSERT INTO tasks
                      (title, priority, is_auto, deadline_date, deadline_minutes, total_duration, duration_left, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                taskName.trim(),
                priority,
                1,
                deadlineDate.toLocaleDateString("sv-SE"),
                deadlineMinutes,
                0,
                null,
                new Date().toISOString(),
              ],
            );
          } else {
            const taskId = existing.id;

            await db.runAsync(`DELETE FROM task_schedules WHERE taskId = ?`, [
              taskId,
            ]);

            await db.runAsync(
              `UPDATE tasks SET
                      title=?, priority=?, is_auto=?, deadline_date=?, deadline_minutes=?, total_duration=?, duration_left=?
                    WHERE id=?`,
              [
                taskName.trim(),
                priority,
                1,
                deadlineDate.toLocaleDateString("sv-SE"),
                deadlineMinutes,
                0,
                null,
                taskId,
              ],
            );
          }
        } else {
          const newAuthority = computeAuthority({
            priority,
            deadlineDate: deadlineDate.toLocaleDateString("sv-SE"),
            deadlineMinutes: deadlineMinutes,
            duration: totalMinutes,
          });

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // const maxEnd = new Date(today);
          // maxEnd.setDate(maxEnd.getDate() + MAX_LOOKAHEAD_DAYS);
          const scheduleEnd = maxEnd;

          try {
            await db.runAsync("BEGIN TRANSACTION");

            // ===== 1. SAVE TASK FIRST (get taskId) =====
            let taskId;
            const deadlineDateStr = deadlineDate.toLocaleDateString("sv-SE");

            if (mode === "edit") {
              taskId = existing.id;
              await db.runAsync(
                `UPDATE tasks SET
               title=?, priority=?, is_auto=1, deadline_date=?, deadline_minutes=?, total_duration=?, duration_left=?
               WHERE id=?`,
                [
                  taskName.trim(),
                  priority,
                  deadlineDateStr,
                  deadlineMinutes,
                  totalMinutes,
                  totalMinutes,
                  taskId,
                ],
              );

              // Free current task's existing schedules
              await db.runAsync(`DELETE FROM task_schedules WHERE taskId = ?`, [
                taskId,
              ]);
            } else {
              const insertResult = await db.runAsync(
                `INSERT INTO tasks
               (title, priority, is_auto, deadline_date, deadline_minutes, total_duration, duration_left, created_at)
               VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
                [
                  taskName.trim(),
                  priority,
                  deadlineDateStr,
                  deadlineMinutes,
                  totalMinutes,
                  totalMinutes,
                  new Date().toISOString(),
                ],
              );
              taskId = insertResult.lastInsertRowId;
            }

            let existingAutoTasks = [];

            existingAutoTasks = await db.getAllAsync(
              `SELECT * FROM tasks
                WHERE is_auto = 1 AND total_duration > 0 AND id != ?
                `,
              [taskId],
            );

            const mappedAutoTasks = existingAutoTasks.map((t) => ({
              id: t.id,
              title: t.title,
              totalMinutes: t.total_duration,
              priority: t.priority,
              deadlineDate: t.deadline_date,
              deadlineMinutes: t.deadline_minutes,
              authority: computeAuthority({
                priority: t.priority || "Low",
                deadlineDate: t.deadline_date,
                deadlineMinutes: t.deadline_minutes || 0,
                duration: t.total_duration,
              }),
            }));

            const fixedAutoTasks = [];
            const reschedulableTasks = [];

            for (const t of mappedAutoTasks) {
              if (t.authority > newAuthority) {
                fixedAutoTasks.push(t);
              } else {
                reschedulableTasks.push(t);
              }
            }

            // push current task
            reschedulableTasks.push({
              id: taskId,
              title: taskName.trim(),
              priority: priority,
              totalMinutes: totalMinutes,
              deadlineDate: deadlineDateStr,
              deadlineMinutes: deadlineMinutes,
              authority: newAuthority,
            });

            // ===== 6. GET FIXED SCHEDULES =====
            const fixedIds = fixedAutoTasks.map((t) => t.id);
            let fixedSchedulesRow = [];

            if (fixedIds.length > 0) {
              fixedSchedulesRow = await db.getAllAsync(
                `SELECT 
                ts.start_minutes AS start_minutes,
                ts.end_minutes AS end_minutes,
                ts.date AS date,
                'task' AS type,
                t.id AS itemId,
                t.title AS title
               FROM task_schedules ts
               JOIN tasks t ON ts.taskId = t.id
               WHERE ts.taskId IN (${fixedIds.map(() => "?").join(",")})`,
                fixedIds,
              );
            }

            const fixedSchedules = groupBusyBlocks(fixedSchedulesRow);
            const fixedItems = [...busyItems, ...fixedSchedules];

            // ===== 7. BUILD CALENDAR & SCHEDULE =====
            const calendar = buildCalendar({
              busyItems: fixedItems,
              scheduleStart: today,
              scheduleEnd,
            });

            const scheduledResults = autoSchedule({
              calendar,
              autoTasks: reschedulableTasks.sort(
                (a, b) => b.authority - a.authority,
              ),
              scheduleStart: today,
              scheduleEnd,
            });

            // ===== 8. CLEAR AFFECTED SCHEDULES =====
            const affectedTaskIds = reschedulableTasks
              .filter((t) => t.id !== null)
              .map((t) => t.id);

            if (affectedTaskIds.length > 0) {
              await db.runAsync(
                `DELETE FROM task_schedules
               WHERE taskId IN (${affectedTaskIds.map(() => "?").join(",")})`,
                affectedTaskIds,
              );
            }

            // ===== 9. INSERT NEW SCHEDULES =====
            for (const s of scheduledResults) {
              await db.runAsync(
                `INSERT INTO task_schedules
               (taskId, date, start_minutes, end_minutes, duration)
               VALUES (?, ?, ?, ?, ?)`,
                [
                  s.taskId, // All have real IDs now
                  s.date,
                  s.start_minutes,
                  s.end_minutes,
                  s.end_minutes - s.start_minutes,
                ],
              );
            }

            await db.runAsync("COMMIT");
          } catch (err) {
            await db.runAsync("ROLLBACK");

            throw new Error(err?.message || "Auto task scheduling failed");
          }
        }
      } else {
        const now = new Date();

        // Today at 00:00
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Selected date at 00:00
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const maxEnd = new Date(today);
        maxEnd.setDate(maxEnd.getDate() + MAX_LOOKAHEAD_DAYS);

        // Date validation
        if (startDate < today) {
          return Alert.alert("Invalid Date", "Date cannot be in the past.");
        }

        // Time validation (only if date is today) ///////// better to compare with minutes
        if (startDate.getTime() === today.getTime()) {
          if (startMinutes <= now.getHours() * 60 + now.getMinutes()) {
            return Alert.alert(
              "Invalid Time",
              "Time must be later than the current time.",
            );
          }
        }

        if (startDate >= maxEnd) {
          return Alert.alert(
            "Invalid Deadline",
            `Please select deadline before ${formatDate(maxEnd)}.`,
          );
        }

        /* ---------- MANUAL TASK ---------- */
        let startM = startMinutes;
        let endM = endMinutes;
        let selectedDate = date;

        if (startM === endM) {
          return Alert.alert(
            "Invalid Time",
            "End time must be differ from start time.",
          );
        }

        /* ---------- CHECK CONFLICT ---------- */

        const conflict = findConflict({
          items: busyItems,
          date: selectedDate,
          startM: startM,
          endM: endM,
        });

        if (conflict) {
          return Alert.alert(
            "Time Conflict",
            `This task overlaps with ${conflict.type}: "${conflict.title}".`,
          );
        }

        /* ---------- SAVE TASK ---------- */
        try {
          await db.runAsync("BEGIN TRANSACTION");
          let taskId;
          let totalDuration = endM - startM;
          let deadlineDay = new Date(selectedDate);
          deadlineDay.setHours(0, 0, 0, 0);

          if (startM > endM) {
            deadlineDay.setDate(deadlineDay.getDate() + 1);
            totalDuration = 1440 - startM + endM;
          }

          if (mode === "add") {
            const res = await db.runAsync(
              `INSERT INTO tasks
         (title, priority, is_auto, deadline_date, deadline_minutes, total_duration, duration_left, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                taskName.trim(),
                null,
                0,
                deadlineDay.toLocaleDateString("sv-SE"),
                endM,
                totalDuration,
                totalDuration,
                new Date().toISOString(),
              ],
            );
            taskId = res.lastInsertRowId;
          } else {
            taskId = existing.id;

            await db.runAsync(
              `UPDATE tasks SET
          title=?, priority=?, is_auto=?, deadline_date=?, deadline_minutes=?, total_duration=?, duration_left=?
         WHERE id=?`,
              [
                taskName.trim(),
                null,
                0,
                deadlineDay.toLocaleDateString("sv-SE"),
                endM,
                totalDuration,
                totalDuration,
                taskId,
              ],
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
                selectedDate.toLocaleDateString("sv-SE"),
                startM,
                1440,
                1440 - startM,
              ],
            );

            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);

            await db.runAsync(
              `INSERT INTO task_schedules
          (taskId, date, start_minutes, end_minutes, duration)
          VALUES (?, ?, ?, ?, ?)`,
              [taskId, nextDate.toLocaleDateString("sv-SE"), 0, endM, endM],
            );
          } else {
            await db.runAsync(
              `INSERT INTO task_schedules
          (taskId, date, start_minutes, end_minutes, duration)
          VALUES (?, ?, ?, ?, ?)`,
              [
                taskId,
                selectedDate.toLocaleDateString("sv-SE"),
                startM,
                endM,
                endM - startM,
              ],
            );
          }

          //REBALANCE
          await rebalance(
            db,
            "habit",
            selectedDate.toLocaleDateString("sv-SE"),
            startM,
          );

          await db.runAsync("COMMIT");
        } catch (error) {
          await db.runAsync("ROLLBACK");
          console.log(error.message);

          throw new Error(
            error?.message || "Rebalance after scheduling task failed",
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      // console.error("validateAndSave (task) error:", err);
      Alert.alert(
        "Save Failed",
        err?.message || "Something went wrong while saving the task.",
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
                    setActiveDatePicker("deadlineDate");
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.timeSmall}>Date</Text>
                  <Text style={styles.timeLarge}>
                    {formatDate(deadlineDate)}
                  </Text>
                </TouchableOpacity>

                {/* TIME PICKER */}
                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => {
                    setActiveTimePicker("deadlineTime");
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.timeSmall}>Time</Text>
                  <Text style={styles.timeLarge}>
                    {minutesToTimeAMPM(deadlineMinutes)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* IF AUTO-SCHEDULE ON → SHOW DURATION INPUTS */}
            {/* DURATION */}
            {/* DURATION OPTIONS */}
            <View style={styles.section}>
              <Text style={styles.label}>Approx. Duration</Text>

              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.minutes}
                    style={[
                      styles.durationChip,
                      durationMinutes === opt.minutes &&
                        styles.durationChipActive,
                    ]}
                    onPress={() => setDurationMinutes(opt.minutes)}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        durationMinutes === opt.minutes &&
                          styles.durationTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
                    {minutesToTimeAMPM(startMinutes)}
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
                    {minutesToTimeAMPM(endMinutes)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* DATE PICKER MODAL */}
        {showDatePicker && (
          <DateTimePicker
            value={activeDatePicker === "deadlineDate" ? deadlineDate : date}
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
                ? minutesToDate(startMinutes)
                : activeTimePicker === "end"
                  ? minutesToDate(endMinutes)
                  : minutesToDate(deadlineMinutes)
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
        {/* {renderPickerModal(
          showHourModal,
          setShowHourModal,
          [...Array(3).keys()], // 0–12 hours
          setSelectedHours
        )}

        {renderPickerModal(
          showMinuteModal,
          setShowMinuteModal,
          [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
          setSelectedMinutes
        )} */}
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

  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  durationChip: {
    width: "32%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
    alignItems: "center",
    marginBottom: 10,
  },

  durationChipActive: {
    backgroundColor: "#6C63FF",
    borderColor: "#6C63FF",
  },

  durationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  durationTextActive: {
    color: "#FFF",
  },

  durationHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#777",
  },
});
