import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';

import { goHome } from '@/lib/nav';
import { TeasProvider } from '@/lib/teas';
import { C, serif } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

// Po obnovení stránky nie je v histórii kam ísť späť, tak ponúkneme návrat na zoznam.
function HomeButton() {
  return (
    <Pressable onPress={() => goHome(false)} hitSlop={10} style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: C.accent, fontSize: 16, fontWeight: '600' }}>‹ Čaje</Text>
    </Pressable>
  );
}

const withHomeFallback =
  (title: string) =>
  ({ navigation }: { navigation: { canGoBack: () => boolean } }) =>
    navigation.canGoBack() ? { title } : { title, headerLeft: () => <HomeButton /> };

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
        <Stack.Screen name="caj/[id]" options={withHomeFallback('')} />
        <Stack.Screen name="upravit" options={withHomeFallback('Čaj')} />
        <Stack.Screen name="nastavenia" options={withHomeFallback('Nastavenia')} />
        <Stack.Screen name="historia" options={withHomeFallback('História')} />
        <Stack.Screen name="sprievodca/index" options={withHomeFallback('')} />
        <Stack.Screen name="sprievodca/[id]" options={withHomeFallback('')} />
      </Stack>
    </TeasProvider>
  );
}
