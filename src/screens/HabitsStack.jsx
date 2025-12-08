import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EditHabit from "./EditHabit";
import Habits from "./Habits";

const Stack = createNativeStackNavigator();

export default function HabitsStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Habits"
    >
      <Stack.Screen name="Habits" component={Habits} />
      <Stack.Screen name="EditHabit" component={EditHabit} />
    </Stack.Navigator>
  );
}
