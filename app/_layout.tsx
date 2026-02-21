import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        initialRouteName="(tabs)" // Apenas o nome do grupo, sem a barra
        screenOptions={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          headerTintColor: '#fff',
        }}
      >
        {/* Aqui definimos as rotas filhas */}
        <Stack.Screen name="(telas)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Aviso' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}