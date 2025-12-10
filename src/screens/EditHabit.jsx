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
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function EditHabit() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const mode = params.mode === "edit" ? "edit" : "add";
  const existing = params.habit || {};

  /* ------------------------- STATES ------------------------- */
  const [habitName, setHabitName] = useState(existing.habitName ?? "");
  const [days, setDays] = useState(existing.days ?? Array(7).fill(false));

  const [isAuto, setIsAuto] = useState(existing.isAuto ?? true);

  const [selectedHours, setSelectedHours] = useState(
    existing.selectedHours ?? 0
  );
  const [selectedMinutes, setSelectedMinutes] = useState(
    existing.selectedMinutes ?? 0
  );

  const [startTime, setStartTime] = useState(
    existing.startTime ?? new Date(new Date().setHours(9, 0, 0, 0))
  );
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showHourModal, setShowHourModal] = useState(false);
  const [showMinuteModal, setShowMinuteModal] = useState(false);

  /* ------------------------- FUNCTIONS ------------------------- */

  const toggleDay = (index) => {
    const copy = [...days];
    copy[index] = !copy[index];
    setDays(copy);
  };

  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) setStartTime(selectedTime);
  };

  const validateAndSave = () => {
    // TODO: VALIDATE USER INPUT
    // TODO: SAVE HABIT INTO LOCAL DB OR SECURE STORE
    // TODO: HANDLE AUTO-SCHEDULING

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
        </View>

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

        {/* AUTO-SCHEDULE */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              Auto-schedule the best time for this habit
            </Text>

            <Switch
              value={isAuto}
              onValueChange={setIsAuto}
              trackColor={{ false: "#ccc", true: "#6C63FF" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* TIME PICKER */}
        {!isAuto && (
          <View style={styles.section}>
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeCard}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeLarge}>
                  {startTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display="spinner"
            onChange={onChangeTime}
          />
        )}

        {/* SAVE BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={validateAndSave}>
            <Text style={styles.saveBtnText}>Save Habit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
