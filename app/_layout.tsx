import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '../src/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleNavigation(session);
      setIsReady(true);
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Limpa userType ao deslogar
        await AsyncStorage.removeItem('@user_type');
      }
      await handleNavigation(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, [segments]);

  // -------------------------------
  // Função central de navegação
  // -------------------------------
  const handleNavigation = async (session: any) => {
    if (!router) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (session) {
      const email = session.user.email;

      // 🔐 Se for admin específico
      if (email === 'jare7play@gmail.com') {
        router.replace('/(telas)/dashboard');
        return;
      }

      // 👇 Se não for admin, segue fluxo normal
      const userType = await AsyncStorage.getItem('@user_type');

      if (userType === 'motorista') {
        router.replace('/(telas)/motoristaLogado');
      } else {
        router.replace('/(telas)/passageiroLogado');
      }

    } else {
      // Não logado → vai para tabs
      if (!inTabsGroup) {
        router.replace('/(tabs)');
      }
    }
  };

  // Loader enquanto checa sessão
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // -------------------------------
  // Render da navegação
  // -------------------------------
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" /> 
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(telas)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}