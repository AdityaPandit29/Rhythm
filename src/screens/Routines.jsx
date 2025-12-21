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
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import RoutineCard from "../components/RoutineCard";

export default function Routines() {
  const navigation = useNavigation();
  const db = useSQLiteContext();

  const [routines, setRoutines] = useState([]);

  // Load all routines + their days
  const loadRoutines = async () => {
    try {
      // Fetch routines
      const routineRows = await db.getAllAsync(`
        SELECT * FROM routines ORDER BY id DESC;
      `);

      // Fetch days separately
      const daysRows = await db.getAllAsync(`
        SELECT routineId, day FROM routine_days;
      `);

      // Convert days to a structure like: { 1: [0,1], 2:[5], ... }
      const dayMap = {};
      for (let row of daysRows) {
        if (!dayMap[row.routineId]) dayMap[row.routineId] = [];
        dayMap[row.routineId].push(row.day);
      }

      // Merge routines + days into final list
      const finalList = routineRows.map((r) => ({
        id: r.id,
        name: r.title,
        startMinutes: r.start_minutes,
        endMinutes: r.end_minutes,
        daysSelected: dayMap[r.id] || [], // e.g. [1,3]
      }));

      setRoutines(finalList);
    } catch (err) {
      console.log("Load routines error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadRoutines);
    return unsubscribe; // reload on screen focus
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Routines</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ADD ROUTINE BUTTON */}
        <TouchableOpacity
          style={styles.addRoutineBtn}
          onPress={() => navigation.navigate("EditRoutine")}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#6C63FF" />
          <Text style={styles.addRoutineText}>Add Routine</Text>
        </TouchableOpacity>

        {/* Render routines from DB */}
        {routines.map((r) => (
          <RoutineCard
            key={r.id}
            id={r.id}
            name={r.name}
            startMinutes={r.startMinutes}
            endMinutes={r.endMinutes}
            daysSelected={r.daysSelected}
            onDeleted={loadRoutines}
          />
        ))}
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* ADD Routine BUTTON */
  addRoutineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: "#6C63FF",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },

  addRoutineText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6C63FF",
  },
});
