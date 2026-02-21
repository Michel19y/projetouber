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
    // Definimos a função dentro do useEffect para evitar dependências externas
    const initializeApp = async () => {
      try {
        // 1. Verifica se existe uma sessão ativa ao abrir o app
        const { data: { session } } = await supabase.auth.getSession();

        // 2. Só navega se o sistema de rotas estiver pronto
        if (segments !== undefined) {
          await handleNavigation(session);
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
      } finally {
        // Garante que o loading saia da tela indepedente de sucesso ou erro
        setIsReady(true);
      }
    };

    // Chamada correta da Promise
    initializeApp();

    // Ouvinte de mudanças na autenticação (Login/Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await AsyncStorage.removeItem('@user_type');
      }
      handleNavigation(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [segments]); // Monitora segmentos para decidir redirecionamentos

  const handleNavigation = async (session: any) => {
    // Proteção: Se o router ainda não estiver disponível, aborta
    if (!router || segments === undefined) return;

    const userType = await AsyncStorage.getItem('@user_type');
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inTelasGroup = segments[0] === '(telas)';

    if (session) {
      // Usuário LOGADO: Se estiver nas telas de login ou início, manda para o Dashboard
      if (inAuthGroup || inTabsGroup || segments.length === 0) {
        const rotaDestino = userType === 'motorista'
            ? '/(telas)/motoristaLogado'
            : '/(telas)/passageiroLogado';

        router.replace(rotaDestino);
      }
    } else {
      // Usuário DESLOGADO:
      // Se ele tentar acessar uma tela restrita (telas), manda para o login correspondente
      if (inTelasGroup && userType) {
        const rotaLogin = userType === 'motorista'
            ? '/(auth)/loginMotorista'
            : '/(auth)/loginPassageiro';
        router.replace(rotaLogin);
      }
    }
  };

  // Tela de carregamento enquanto verifica sessão e storage
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
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(telas)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
  );
}