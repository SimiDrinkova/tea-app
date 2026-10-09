import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { TeasProvider } from '@/lib/teas';
import { C, serif } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <TeasProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerShadowVisible: false,
          headerTintColor: C.accent,
          headerTitleStyle: { fontFamily: serif, color: C.text },
          headerBackTitle: 'Späť',
          contentStyle: { backgroundColor: C.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Môj čaj' }} />
        <Stack.Screen name="caj/[id]" options={{ title: '' }} />
        <Stack.Screen name="upravit" options={{ title: 'Čaj' }} />
        <Stack.Screen name="nastavenia" options={{ title: 'Časovač a záloha' }} />
      </Stack>
    </TeasProvider>
  );
}
