import { Lora_600SemiBold } from '@expo-google-fonts/lora';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from '@expo-google-fonts/work-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreGate } from '../components/StoreGate';
import { StoreProvider } from '../lib/store';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// On web, react-native-safe-area-context only measures real insets inside a
// useEffect (browser-only), so it renders `null` until then. The static
// export's build environment resolves that effect before capturing the HTML,
// so server output has full content while the client's first hydration pass
// starts with insets still null — a hydration mismatch on every route.
// Seeding a default here makes both the server render and the client's first
// render non-null; the effect still runs afterward to apply the real insets.
const SAFE_AREA_INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora_600SemiBold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // On native, the splash screen covers this gap, so waiting for fonts avoids
  // a flash of unstyled text. On web, the static export is server-rendered
  // with fonts already resolved, so gating the tree on fontsLoaded here would
  // make the client's first hydration pass (fontsLoaded still false) render
  // `null` against a server HTML that isn't — a guaranteed hydration mismatch
  // on every route. Render the tree unconditionally on web instead.
  if (!fontsLoaded && Platform.OS !== 'web') return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider initialMetrics={SAFE_AREA_INITIAL_METRICS}>
        <StoreProvider>
          <StoreGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          </StoreGate>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
