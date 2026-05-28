import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "../src/lib/supabase";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // 1. Monitora a prontidão nativa do Expo Router
  useEffect(() => {
    console.log("🖥️ [DEBUG-ROUTER] Iniciando montagem do RootLayout...");
    const timer = setTimeout(() => {
      console.log(
        "🟢 [DEBUG-ROUTER] Instância física do Expo Router está PRONTA.",
      );
      setIsNavigationReady(true);
    }, 250); // Aumentamos um pouco para dar fôlego ao sistema
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isNavigationReady) return;

    const checkSession = async () => {
      console.log("🔍 [DEBUG-AUTH] Iniciando varredura de sessão local...");
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "❌ [DEBUG-SUPABASE] Erro ao buscar sessão:",
            error.message,
          );
          return;
        }

        // Dispara a navegação inicial com os dados coletados
        await handleNavigation(session, "CHECK_SESSION_INICIAL");
      } catch (e) {
        console.error(
          "❌ [DEBUG-GERAL] Falha catastrófica no CheckSession:",
          e,
        );
      } finally {
        console.log("🔓 [DEBUG-LAYOUT] Liberando tela de Splash Screen.");
        setIsReady(true);
      }
    };

    checkSession();

    // Ouvinte de mudanças globais de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔔 [DEBUG-EVENTO] Supabase disparou o evento: ${event}`);

        if (event === "SIGNED_OUT") {
          console.log(
            "🧹 [DEBUG-STORAGE] Limpando @user_type da memória devido a SIGNED_OUT.",
          );
          await AsyncStorage.removeItem("@user_type");
        }

        if (isNavigationReady && isReady) {
          handleNavigation(session, `EVENTO_${event}`);
        } else {
          console.log(
            "⚠️ [DEBUG-EVENTO] Bloqueado redirecionamento pelo evento pois o layout ainda está carregando.",
          );
        }
      },
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [isNavigationReady, isReady]);

  const handleNavigation = async (session: any, origem: string) => {
    if (!isNavigationReady || !router) {
      console.log(
        `🛑 [DEBUG-NAV] Tentativa de navegação abortada por ${origem}: Router indisponível.`,
      );
      return;
    }

    try {
      // 📑 CAPTURA TUDO QUE O DISPOSITIVO TRAZ NA MEMÓRIA AGORA:
      const userType = await AsyncStorage.getItem("@user_type");
      const currentSegment =
        segments && segments.length > 0 ? segments.join("/") : "raiz";
      const userId = session?.user?.id || "Nenhum usuário ativo";
      const userEmail = session?.user?.email || "Nenhum e-mail";
      const userRole = session?.user?.user_metadata?.role || "user";

      console.log("=========================================================");
      console.log(`🛰️ [DEBUG-DIAGNÓSTICO] DISPARADO POR: ${origem}`);
      console.log(`👉 Tela/Segmento Atual do App: "${currentSegment}"`);
      console.log(`🔑 ID do Usuário na Auth: ${userId}`);
      console.log(`📧 E-mail na Auth: ${userEmail}`);
      console.log(`👑 Role na Auth (Metadados): "${userRole}"`);
      console.log(`🗂️ Perfil no AsyncStorage (@user_type): "${userType}"`);
      console.log("---------------------------------------------------------");

      const inTabsGroup = segments[0] === "(tabs)";

      if (session) {
        // 🛡️ 1. TRAVA DE SEGURANÇA INTERROMPIDA SE FOR O ADMIN (Por Role OU por E-mail corporativo)
        if (userRole === "admin" || userEmail === "michel@teste.com") {
          console.log(
            "👑 [DIREÇÃO] Administrador Mestre reconhecido pelo sistema.",
          );

          // Se der F5 em qualquer tela que contenha "dashboard" na rota ou URL, segura o Admin lá!
          if (
            currentSegment.includes("dashboard") ||
            (typeof window !== "undefined" &&
              window.location.pathname.includes("dashboard"))
          ) {
            console.log(
              "✅ [DIREÇÃO] F5 detectado no Dashboard. Redirecionamento cancelado para preservar a sessão do admin.",
            );
            console.log(
              "=========================================================",
            );
            return; // TRAVA O ROTEADOR E NÃO DEIXA REDIRECIONAR!
          }
        }
        // 🚗 2. SE FOR MOTORISTA
        else if (userType === "motorista") {
          if (!currentSegment.includes("motoristaLogado")) {
            // 👈 adiciona essa verificação
            console.log(
              "🚀 [DIREÇÃO] Empurrando para: /(telas)/motoristaLogado",
            );
            router.replace("/(telas)/motoristaLogado");
          } else {
            console.log(
              "✅ [DIREÇÃO] Já está em motoristaLogado. Redirecionamento cancelado.",
            );
          }
          console.log(
            "=========================================================",
          );
          return;
        }

        // 🚶‍♂️ 3. SE FOR PASSAGEIRO
        else if (userType === "passageiro") {
          if (!currentSegment.includes("passageiroLogado")) {
            // 👈 mesma coisa
            console.log(
              "🚀 [DIREÇÃO] Empurrando para: /(telas)/passageiroLogado",
            );
            router.replace("/(telas)/passageiroLogado");
          } else {
            console.log(
              "✅ [DIREÇÃO] Já está em passageiroLogado. Redirecionamento cancelado.",
            );
          }
          console.log(
            "=========================================================",
          );
          return;
        }

        // ⚠️ 4. TRATAMENTO CASO CAIA NO SEU CENÁRIO ATUAL (Cai aqui se não for o Michel nem role admin)
        if (userRole !== "admin" && userEmail !== "michel@teste.com") {
          console.log(
            `⚠️ [DIREÇÃO] Usuário comum sem perfil definido. Empurrando para /(tabs)`,
          );
          if (!inTabsGroup) router.replace("/(tabs)");
        }
      } else {
        console.log(
          "🚀 [DIREÇÃO] Nenhuma sessão ativa detectada. Mandando para a estaca zero: /(tabs)",
        );
        if (!inTabsGroup) router.replace("/(tabs)");
      }
      console.log("=========================================================");
    } catch (err) {
      console.error("❌ [DEBUG-NAV] Erro grave ao processar rotas:", err);
    }
  };

  if (!isReady || !isNavigationReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#34C759" />
        <Text
          style={{
            color: "#666",
            marginTop: 14,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          Iniciando sistema...
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(telas)" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
