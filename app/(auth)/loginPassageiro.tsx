import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // 👈 Adicionado para salvar a memória do tipo de perfil
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/lib/supabase";

export default function LoginPassageiro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha todos os campos para entrar.");
      return;
    }

    setLoading(true);

    try {
      // 🌐 APENAS REPASSA O TRABALHO PARA O SEU BACKEND NODE
      // Substitua localhost pelo IP da sua máquina se for testar no celular físico!
      const response = await fetch(
        "http://localhost:3001/api/auth/login-passageiro",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            password: password,
          }),
        },
      );

      const data = await response.json();

      // Se o backend disser que não (erro 401, 403, etc), o front só exibe a mensagem
      if (!response.ok) {
        Alert.alert("Erro no Login", data.error || "Não foi possível entrar.");
        return;
      }

      // 📌 Se o Back aprovou, salvamos o tipo e sincronizamos a sessão no celular
      await AsyncStorage.setItem("@user_type", "passageiro");

      // Esse comando inicializa o cliente local do Supabase com os tokens que o Back gerou
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // ✅ Manda direto para a tela interna do passageiro
      router.replace("/(telas)/passageiroLogado");
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Ocorreu um erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="key" size={40} color="#007AFF" />
        </View>

        <Text style={styles.title}>Acesse sua conta</Text>
        <Text style={styles.subtitle}>
          Olá passageiro, que bom ver você novamente!
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#555"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#555"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push("/(auth)/registerPassageiro")}
        >
          <Text style={styles.registerTextNormal}>Não tem conta? </Text>
          <Text style={styles.registerTextBold}>Cadastre-se aqui</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF15",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#007AFF30",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  form: {
    gap: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingVertical: 18,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  registerTextNormal: {
    color: "#666",
    fontSize: 15,
  },
  registerTextBold: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
