import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* MAIN WRAPPER FOR SPACING */}

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>

        <TouchableOpacity style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog-outline" size={22} color="#444" />
        </TouchableOpacity>
      </View>
      <View style={styles.contentWrapper}>
        {/* QUOTE SECTION */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            “Small progress is still progress.”
          </Text>
        </View>

        {/* MAIN EVENT CARD */}
        <View style={styles.mainEventCard}>
          <Text style={styles.cardTitle}>Next Event</Text>

          <Text style={styles.mainTime}>01:35:20</Text>

          <Text style={styles.subText}>Task: Math Assignment</Text>

          {/* STATUS PILL */}
          <View style={[styles.statusPill, { backgroundColor: "#5CCF5C20" }]}>
            <Text style={[styles.statusText, { color: "#2E9B2E" }]}>
              On Time
            </Text>
          </View>
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Today’s Score: 64%</Text>

          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: "64%" }]} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  contentWrapper: {
    flex: 1,
    // paddingVertical: 20,
    alignItems: "center",
    // gap: 40,
    justifyContent: "space-evenly",
  },

  /* HEADER */
  header: {
    height: 60,
    width: "100%",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    position: "relative",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },

  settingsBtn: {
    position: "absolute",
    right: 16,
  },

  /* QUOTE */
  quoteContainer: {
    width: "100%",
    alignItems: "center",
  },

  quoteText: {
    fontSize: 14,
    color: "#6C63FF",
    fontWeight: "500",
    textAlign: "center",
  },

  /* MAIN EVENT CARD */
  mainEventCard: {
    width: 300,
    height: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",

    // Shadow
    elevation: 3,
  },

  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },

  mainTime: {
    fontSize: 40,
    fontWeight: "700",
    marginTop: 10,
    color: "#333",
  },

  subText: {
    marginTop: 4,
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },

  statusPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* PROGRESS BAR */
  progressContainer: {
    width: "100%",
    alignItems: "center",
  },

  progressText: {
    fontSize: 12,
    color: "#444",
    marginBottom: 6,
  },

  progressBarBackground: {
    width: "80%",
    height: 10,
    backgroundColor: "#EDEBFF",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#6C63FF",
  },
});
