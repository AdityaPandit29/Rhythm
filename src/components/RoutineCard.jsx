import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";

export default function RoutineCard({
  id,
  name,
  startTime,
  endTime,
  daysSelected,
  onDeleted,
}) {
  const navigation = useNavigation();
  const db = useSQLiteContext();

  // daysSelected: number[] (0 = Sun ... 6 = Sat)

  const booleanDays = Array(7).fill(false);

  daysSelected.forEach((day) => {
    booleanDays[day] = true;
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Routine",
      `Are you sure you want to delete "${name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync(
                `DELETE FROM routine_days WHERE routineId = ?`,
                [id]
              );
              await db.runAsync(`DELETE FROM routines WHERE id = ?`, [id]);

              // 👉 Trigger refresh in parent
              if (onDeleted) {
                onDeleted();
              }
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", "Failed to delete routine.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* TOP RIGHT ICONS */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            navigation.navigate("EditRoutine", {
              mode: "edit",
              routine: {
                id: id,
                label: name,
                startTime: startTime,
                endTime: endTime,
                days: booleanDays,
              },
            })
          }
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#6C63FF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
          <MaterialCommunityIcons name="delete" size={20} color="#D9534F" />
        </TouchableOpacity>
      </View>

      {/* TITLE */}
      <Text style={styles.title}>{name}</Text>

      {/* SCHEDULED TIME */}
      <Text style={styles.schedule}>
        {startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}{" "}
        -{" "}
        {endTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </Text>

      {/* WEEKDAY */}
      <View style={styles.daysRow}>
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <View
            key={index}
            style={[
              styles.dayBubbleSmall,
              !booleanDays[(index + 1) % 7] && { backgroundColor: "#EFEFFF" },
            ]}
          >
            <Text
              style={[
                styles.dayTextSmall,
                !booleanDays[(index + 1) % 7] && { color: "#444" },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,

    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },

    position: "relative",
  },

  iconRow: {
    position: "absolute",
    right: 12,
    top: 12,
    flexDirection: "row",
    zIndex: 10,
  },

  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F4F4F5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    paddingRight: 70,
    marginBottom: 10,
  },

  subText: {
    fontSize: 13,
    color: "#777",
  },

  schedule: {
    fontSize: 14,
    fontWeight: "500",
    color: "#444",
    marginTop: 6,
  },

  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },

  dayBubbleSmall: {
    height: 24,
    width: 24,
    backgroundColor: "#6C63FF",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  dayTextSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
});
