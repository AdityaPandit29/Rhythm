import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import Dashboard from "./src/screens/Dashboard";
import { NavigationContainer } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import RoutinesStack from "./src/screens/RoutineStack";
import HabitsStack from "./src/screens/HabitsStack";
import TasksStack from "./src/screens/TasksStack";
import { useEffect, useState } from "react";
import DatabaseSetup, { setupDatabase } from "./src/database/DatabaseSetup";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { rescheduleAllNotifications } from "./src/utils/notify.js";

const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // shows popup/banner
    shouldShowList: true, // shows in notification tray
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <SQLiteProvider databaseName="rhythm.db">
      <DatabaseSetup />
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer>
          <Tab.Navigator
            initialRouteName="Dashboard"
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: "#6C63FF",
              tabBarInactiveTintColor: "#A1A1A1",
              tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
              tabBarStyle: {
                backgroundColor: "rgba(255, 255, 255, 1)",
                borderTopColor: "rgba(0,0,0,0.08)",
                borderTopWidth: 1,
                elevation: 0,
                height: 55,
              },
              safeAreaInsets: {
                bottom: 0,
              },
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={Dashboard}
              options={{
                title: "Dashboard",
                tabBarIcon: ({ color }) => (
                  <MaterialCommunityIcons
                    name="view-dashboard-outline"
                    size={28}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="RoutinesStack"
              component={RoutinesStack}
              options={{
                title: "Routines",
                tabBarIcon: ({ color }) => (
                  <MaterialCommunityIcons
                    name="calendar-range"
                    size={28}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="HabitsStack"
              component={HabitsStack}
              options={{
                title: "Habits",
                tabBarIcon: ({ color }) => (
                  <MaterialCommunityIcons
                    name="progress-check"
                    size={28}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="TasksStack"
              component={TasksStack}
              options={{
                title: "Tasks",
                tabBarIcon: ({ color }) => (
                  <MaterialCommunityIcons
                    name="bullseye-arrow"
                    size={28}
                    color={color}
                  />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SQLiteProvider>
  );
}
