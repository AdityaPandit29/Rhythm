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
import RoutineCard from "../components/RoutineCard";

export default function Routines() {
  const navigation = useNavigation();
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

        <RoutineCard
          name="Office"
          startTime="8:00 AM"
          endTime="5:00 PM"
          daysSelected={[true, true, true, true, true, false, false]}
        />
        <RoutineCard
          name="Gym"
          startTime="6:00 PM"
          endTime="7:00 PM"
          daysSelected={[false, false, false, false, false, true, true]}
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
