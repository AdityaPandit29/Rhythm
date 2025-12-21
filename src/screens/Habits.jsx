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

      // Fetch days separately
      const daysRows = await db.getAllAsync(`
        SELECT habitId, day FROM habit_days;
      `);

      // Convert days to a structure like: { 1: [0,1], 2:[5], ... }
      const dayMap = {};
      for (let row of daysRows) {
        if (!dayMap[row.habitId]) dayMap[row.habitId] = [];
        dayMap[row.habitId].push(row.day);
      }

      // Merge habits + days into final list
      const finalList = habitRows.map((h) => ({
        id: h.id,
        name: h.title,
        startMinutes: h.start_minutes,
        endMinutes: h.end_minutes,
        bestStreak: h.best_streak,
        currentStreak: h.current_streak,
        daysSelected: dayMap[h.id] || [], // e.g. [1,3]
      }));

      setHabits(finalList);
    } catch (err) {
      console.log("Load habits error:", err);
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
            startMinutes={h.startMinutes}
            endMinutes={h.endMinutes}
            bestStreak={h.bestStreak}
            currentStreak={h.currentStreak}
            daysSelected={h.daysSelected} // [0,1,...]
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
