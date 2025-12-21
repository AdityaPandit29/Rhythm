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
import TaskCard from "../components/TaskCard";

export default function Tasks() {
  const navigation = useNavigation();
  const db = useSQLiteContext();

  const [tasks, setTasks] = useState([]);

  // Load all tasks + their schedules
  const loadTasks = async () => {
    try {
      /* ---------- FETCH TASKS ---------- */
      const taskRows = await db.getAllAsync(`
      SELECT * FROM tasks
      ORDER BY id DESC;
    `);

      /* ---------- FETCH SCHEDULES ---------- */
      const scheduleRows = await db.getAllAsync(`
      SELECT 
        taskId,
        date,
        start_minutes,
        end_minutes,
        duration
      FROM task_schedules
      ORDER BY date ASC;
    `);

      /**
       * scheduleMap structure:
       * {
       *   taskId: {
       *     dates: ["2025-01-10", "2025-01-11"],
       *     startTime:[start time for each scheduled date(because it can vary in auto scheduling). if manual then same time each day],
       *     endTime:[end time for each scheduled date(because it can vary in auto scheduling), if manual then same time each day],
       *      duration:[]
       *   }
       * }
       */
      const scheduleMap = {};

      for (let row of scheduleRows) {
        if (!scheduleMap[row.taskId]) {
          scheduleMap[row.taskId] = {
            dates: [],
            startTime: [],
            endTime: [],
            duration: [],
          };
        }
        scheduleMap[row.taskId].dates.push(row.date);
        scheduleMap[row.taskId].startTime.push(row.start_time);
        scheduleMap[row.taskId].endTime.push(row.end_time);
        scheduleMap[row.taskId].duration.push(row.duration);
      }

      /* ---------- MERGE TASKS + SCHEDULES ---------- */
      const finalList = taskRows.map((t) => {
        const schedule = scheduleMap[t.id];

        return {
          id: t.id,
          name: t.title,
          priority: t.priority,
          isAuto: t.is_auto,
          deadline: t.deadline,
          createdAt: t.created_at,

          // Scheduling info
          startTime: schedule?.startTime || [],
          endTime: schedule?.endTime || [],
          scheduledDates: schedule?.dates || [],
          duration: schedule?.duration || [],

          totalDuration: t.total_duration,
          durationLeft: t.duration_left,
        };
      });

      setTasks(finalList);
    } catch (err) {
      console.error("Load tasks error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadTasks);
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ADD TASK BUTTON */}
        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={() => navigation.navigate("EditTask", { mode: "add" })}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#6C63FF" />
          <Text style={styles.addTaskText}>Add Task</Text>
        </TouchableOpacity>

        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            id={t.id}
            name={t.name}
            priority={t.priority}
            isAuto={t.isAuto}
            deadline={t.deadline}
            startTimes={t.startTime}
            endTimes={t.endTime}
            scheduledDates={t.scheduledDates}
            durations={t.duration}
            totalDuration={t.totalDuration}
            durationLeft={t.durationLeft}
            onDeleted={loadTasks}
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

  /* ADD TASK BUTTON */
  addTaskBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: "#6C63FF",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },

  addTaskText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6C63FF",
  },
});
