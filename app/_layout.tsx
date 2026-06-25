import { Stack } from "expo-router";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "@/global.css";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="HomeScreen" />
          <Stack.Screen name="DailyReportScreen" />
          <Stack.Screen name="InterventionScreen" />
        </Stack>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}