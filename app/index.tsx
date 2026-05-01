import { Stack } from "expo-router";
import ReserveApp from "../ReserveApp";

export default function IndexScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ReserveApp />
    </>
  );
}
