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
      handleNavigation(session);
      setIsReady(true); 
    };
    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      handleNavigation(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, [segments, isReady]);

  const handleNavigation = (session: any) => {
    if (!isReady) return;

    // Se houver sessão, tiramos ele das telas de "visitante" (Tabs ou Auth)
    if (session) {
      const isVisitorArea = segments[0] === '(tabs)' || segments[0] === '(auth)';
      
      if (isVisitorArea) {
        // Redireciona para o caminho específico que você definiu no Drive E:
        router.replace('/(telas)/motoristaLogado');
      }
    } 
    // Se NÃO houver sessão, o fluxo segue padrão e ele cai nas (tabs) automaticamente
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Ordem de prioridade das rotas */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(telas)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Aviso' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}