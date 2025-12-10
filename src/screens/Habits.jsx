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
import HabitCard from "../components/HabitCard";

export default function Habits() {
  const navigation = useNavigation();
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

        <HabitCard
          name="Reading"
          duration="25 min"
          isFlexible={false}
          isAutomatic={true}
          startTime="7:00 PM"
          endTime="8:00 PM"
          daysSelected={[true, false, true, false, true, false, false]}
          currentStreak="4"
          bestStreak="14"
        />
        <HabitCard
          name="Meditation"
          duration="15 min"
          isFlexible={true}
          startTime="7:00 PM"
          endTime="8:00 PM"
          daysSelected={[true, true, true, true, true, true, true]}
          currentStreak="1500"
          bestStreak="1000"
        />
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
