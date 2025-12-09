import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";

export default function RoutineCard({
  id,
  name,
  startTime,
  endTime,
  daysSelected,
  onEdit,
  onDelete,
}) {
  const navigation = useNavigation();

  return (
    <View style={styles.card}>
      {/* TOP RIGHT ICONS */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate("EditRoutine", { mode: "edit" })}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#6C63FF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <MaterialCommunityIcons name="delete" size={20} color="#D9534F" />
        </TouchableOpacity>
      </View>

      {/* TITLE */}
      <Text style={styles.title}>{name}</Text>

      {/* SCHEDULED TIME */}
      <Text style={styles.subText}>
        {startTime} - {endTime}
      </Text>

      {/* WEEKDAY */}
      <View style={styles.daysRow}>
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <View
            key={index}
            style={[
              styles.dayBubbleSmall,
              !daysSelected[index] && { backgroundColor: "#EFEFFF" },
            ]}
          >
            <Text
              style={[
                styles.dayTextSmall,
                !daysSelected[index] && { color: "#444" },
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
    width: 40,
    height: 40,
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
