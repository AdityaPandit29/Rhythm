import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Tasks from "./Tasks";
import EditTask from "./EditTask";

const Stack = createNativeStackNavigator();

export default function TasksStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Tasks"
    >
      <Stack.Screen name="Tasks" component={Tasks} />
      <Stack.Screen name="EditTask" component={EditTask} />
    </Stack.Navigator>
  );
}
