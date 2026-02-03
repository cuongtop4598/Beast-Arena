import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#0D0D1A' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="character-select" />
        <Stack.Screen name="stage-select" />
        <Stack.Screen name="fight" options={{ orientation: 'landscape', gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
