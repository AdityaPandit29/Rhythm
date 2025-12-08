import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Routines from "./Routines";
import EditRoutine from "./EditRoutine";

const Stack = createNativeStackNavigator();

export default function RoutinesStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Routines"
    >
      <Stack.Screen name="Routines" component={Routines} />
      <Stack.Screen name="EditRoutine" component={EditRoutine} />
    </Stack.Navigator>
  );
}
