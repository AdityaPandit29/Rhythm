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
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";

export default function EditTask() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const mode = params.mode === "edit" ? "edit" : "add";
  const existing = params.task || {};

  const priorityColors = {
    high: "#FF5555",
    medium: "#F7B801",
    low: "#4CAF50",
  };

  /* ------------------------- STATES ------------------------- */
  const [taskName, setTaskName] = useState(existing.taskName ?? "");
  const [isMonthly, setIsMonthly] = useState(existing.isMonthly ?? false);
  const [priority, setPriority] = useState(existing.priority ?? "medium");
  const [isAuto, setIsAuto] = useState(existing.isAuto ?? true);
  const [deadline, setDeadline] = useState(existing.deadline ?? new Date());
  const [selectedHours, setSelectedHours] = useState(
    existing.selectedHours ?? 0
  );
  const [selectedMinutes, setSelectedMinutes] = useState(
    existing.selectedMinutes ?? 0
  );

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

  const validateAndSave = () => {
    // 👉 VALIDATE & SAVE LOGIC HERE
    navigation.goBack();
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
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Repeat Monthly</Text>
            <Switch
              value={isMonthly}
              onValueChange={setIsMonthly}
              trackColor={{ false: "#ccc", true: "#6C63FF" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* PRIORITY */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>

          <View style={styles.typeRow}>
            {/* LOW */}
            <Pressable
              style={[
                styles.typeOption,
                priority === "low" && { backgroundColor: "#6C63FF" },
              ]}
              onPress={() => setPriority("low")}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColors["low"] },
                ]}
              />
              <Text
                style={[
                  styles.typeText,
                  priority === "low" && { color: "white" },
                ]}
              >
                Low
              </Text>
            </Pressable>

            {/* MEDIUM */}
            <Pressable
              style={[
                styles.typeOption,
                priority === "medium" && { backgroundColor: "#6C63FF" },
              ]}
              onPress={() => setPriority("medium")}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColors["medium"] },
                ]}
              />
              <Text
                style={[
                  styles.typeText,
                  priority === "medium" && { color: "white" },
                ]}
              >
                Medium
              </Text>
            </Pressable>

            {/* HIGH */}
            <Pressable
              style={[
                styles.typeOption,
                priority === "high" && { backgroundColor: "#6C63FF" },
              ]}
              onPress={() => setPriority("high")}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColors["high"] },
                ]}
              />
              <Text
                style={[
                  styles.typeText,
                  priority === "high" && { color: "white" },
                ]}
              >
                High
              </Text>
            </Pressable>
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

/* -------------------------------- STYLES (Same as EditHabit) -------------------------------- */

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
