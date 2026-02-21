import AsyncStorage from '@react-native-async-storage/async-storage'; // Importante para a memória de perfil
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
        // Limpa o tipo de usuário ao deslogar para permitir voltar ao início livremente
        await AsyncStorage.removeItem('@user_type');
      }
      await handleNavigation(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, [segments]);

  const handleNavigation = async (session: any) => {
    if (!router) return;

    const userType = await AsyncStorage.getItem('@user_type');
    const inAuthGroup = segments[0] === '(auth)';
    
    if (session) {
      if (inAuthGroup || segments.length === 0 || segments[0] === '(tabs)') {
        const rotaDestino = userType === 'motorista' 
          ? '/(telas)/motoristaLogado' 
          : '/(telas)/passageiroLogado';
        router.replace(rotaDestino);
      }
    } else {
      // Se não houver sessão e o usuário não estiver em Auth ou Tabs, 
      // mas tiver um userType salvo, ele força o login.
      // Se ele clicar em voltar e deletarmos o userType, ele cai nas (tabs)
      if (!inAuthGroup && segments[0] !== '(tabs)' && userType) {
         const rotaLogin = userType === 'motorista' 
          ? '/(auth)/loginMotorista' 
          : '/(auth)/loginPassageiro';
        router.replace(rotaLogin);
      }
    }
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
      {/* Remova todas as options de header daqui */}
      <Stack.Screen name="(auth)" /> 
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(telas)" />
    </Stack>
    <StatusBar style="auto" />
  </ThemeProvider>
);
}