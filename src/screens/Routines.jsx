import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

export default function Routines() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={{ alignItems: "center", paddingBottom: 40 }}
      >
        {/* -------- HEADER -------- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Routines</Text>
        </View>

        {/* -------- ADD ROUTINE BUTTON -------- */}
        <TouchableOpacity
          style={styles.addRoutineBtn}
          onPress={() => navigation.navigate("EditRoutine", { mode: "add" })}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#6C63FF" />
          <Text style={styles.addRoutineText}>Add Busy Time Block</Text>
        </TouchableOpacity>

        {/* -------- ROUTINE CARD 1 -------- */}
        <View style={styles.routineCard}>
          <Text style={styles.routineTitle}>Office / Class</Text>
          <Text style={styles.timeText}>9:00 AM – 5:00 PM</Text>

          <View style={styles.daysRow}>
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
              <View key={day} style={styles.dayChip}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("EditRoutine", { mode: "edit" })
              }
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* -------- ROUTINE CARD 2 -------- */}
        <View style={styles.routineCard}>
          <Text style={styles.routineTitle}>Gym</Text>
          <Text style={styles.timeText}>6:30 PM – 7:30 PM</Text>

          <View style={styles.daysRow}>
            {["Mon", "Wed", "Fri"].map((day) => (
              <View key={day} style={styles.dayChip}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("EditRoutine", { mode: "add" })
              }
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* HEADER */
  header: {
    height: 60,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },

  headerIcon: {
    position: "absolute",
    right: 16,
  },

  /* ADD ROUTINE BUTTON */
  addRoutineBtn: {
    width: "85%",
    borderWidth: 1.5,
    borderColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },

  addRoutineText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6C63FF",
  },

  /* ROUTINE CARD */
  routineCard: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    marginTop: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  routineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  timeText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
    marginTop: 6,
  },

  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },

  dayChip: {
    backgroundColor: "#ECE9FF",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6C63FF",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 14,
  },

  editText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C63FF",
  },

  deleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D9534F",
  },
});
