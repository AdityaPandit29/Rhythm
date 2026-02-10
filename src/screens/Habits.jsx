import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import HabitCard from "../components/HabitCard";

export default function Habits() {
  const navigation = useNavigation();
  const db = useSQLiteContext();

  const [habits, setHabits] = useState([]);

  // Load all habits + their days
  const loadHabits = async () => {
    try {
      // Fetch habits
      const habitRows = await db.getAllAsync(`
        SELECT * FROM habits ORDER BY id DESC;
      `);

      // Fetch all schedules
      const scheduleRows = await db.getAllAsync(`
      SELECT habitId, day, start_minutes, end_minutes
      FROM habit_schedules
      ORDER BY habitId, day, start_minutes;
    `);

      // Build map: habitId -> intervals[]
      const scheduleMap = {};

      for (const row of scheduleRows) {
        if (!scheduleMap[row.habitId]) {
          scheduleMap[row.habitId] = [];
        }

        scheduleMap[row.habitId].push({
          day: row.day,
          start: row.start_minutes,
          end: row.end_minutes,
        });
      }

      // Merge habits + schedules
      const finalList = habitRows.map((h) => ({
        id: h.id,
        name: h.title,
        intervals: scheduleMap[h.id] || [],
        currentStreak: h.current_streak,
        bestStreak: h.best_streak,
      }));

      setHabits(finalList);
    } catch (err) {
      console.error("Load habits error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadHabits);
    return unsubscribe; // reload on screen focus
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Habits</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ADD HABIT BUTTON */}
        <TouchableOpacity
          style={styles.addHabitBtn}
          onPress={() => navigation.navigate("EditHabit")}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#6C63FF" />
          <Text style={styles.addHabitText}>Add Habit</Text>
        </TouchableOpacity>

        {/* Render habits from DB */}
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            id={h.id}
            name={h.name}
            intervals={h.intervals}
            bestStreak={h.bestStreak}
            currentStreak={h.currentStreak}
            onDeleted={loadHabits}
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

  /* ADD HABIT BUTTON */
  addHabitBtn: {
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

  addHabitText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6C63FF",
  },
});
