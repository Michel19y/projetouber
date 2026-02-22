import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '../src/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // 1. Monitora se a navegação do Expo está pronta
  useEffect(() => {
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    // Só executa a lógica se a navegação estiver pronta
    if (!isNavigationReady) return;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erro Supabase:", error.message);
          setIsReady(true); // Libera o loader mesmo com erro
          return;
        }

        await handleNavigation(session);
      } catch (e) {
        console.error("Erro Geral:", e);
      } finally {
        setIsReady(true); // ISSO garante que o loader suma
      }
    };

    checkSession();

    // Listener de mudanças de Auth
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await AsyncStorage.removeItem('@user_type');
      }
      handleNavigation(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, [isNavigationReady]); // Depende da prontidão da navegação

  const handleNavigation = async (session: any) => {
    if (!isNavigationReady || !router) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (session) {
      const userType = await AsyncStorage.getItem('@user_type');

      if (userType === 'motorista') {
        router.replace('/(telas)/motoristaLogado');
      } else if (userType === 'passageiro') {
        router.replace('/(telas)/passageiroLogado');
      } else {
        // Se não tiver tipo de usuário, manda para a escolha (tabs ou login)
        if (!inTabsGroup) router.replace('/(tabs)');
      }
    } else {
      if (!inTabsGroup) {
        router.replace('/(tabs)');
      }
    }
  };

  // Loader (Seu travamento acontecia aqui)
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={{color: '#fff', marginTop: 10}}>Iniciando sistema...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" /> 
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(telas)" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}