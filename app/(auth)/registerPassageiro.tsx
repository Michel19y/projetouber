import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../src/lib/api"; // 👈 Alterado para usar a sua API unificada

// Componente de Input reutilizável
const InputField = ({ icon, ...props }: any) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
    <TextInput style={styles.input} placeholderTextColor="#555" {...props} />
  </View>
);

export default function RegisterPassageiro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [celular, setCelular] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    const cpfLimpo = cpf.replace(/\D/g, "");

    // Validação básica de interface (UX)
    if (!email || !password || !nome || !cpfLimpo) {
      Alert.alert("Campos incompletos", "Por favor, preencha todos os dados.");
      return;
    }

    setLoading(true);

    try {
      // 🚀 Chamada segura apontando para o seu backend Node através da API unificada
      await api.auth.registerPassageiro({
        email,
        password,
        nome,
        cpfLimpo,
        celular,
      });

      // Se o backend respondeu com status de sucesso (201), prossegue aqui:
      Alert.alert("Sucesso!", "Cadastro realizado com sucesso.");

      // Redirecionamento limpo para a tela de login correspondente
      router.replace("/(auth)/loginPassageiro");
    } catch (err: any) {
      // Se o backend retornou erro (ex: CPF já existente), cai direto aqui com a mensagem exata
      Alert.alert(
        "Aviso",
        err.message || "Ocorreu um erro inesperado no servidor.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#000" }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Seja um passageiro nosso</Text>
          <Text style={styles.subtitle}>
            Preencha os dados abaixo para iniciar seu perfil.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Dados Pessoais</Text>

          <InputField
            icon="person-outline"
            placeholder="Nome Completo"
            value={nome}
            onChangeText={setNome}
          />

          <InputField
            icon="mail-outline"
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <InputField
            icon="card-outline"
            placeholder="CPF (somente números)"
            value={cpf}
            onChangeText={setCpf}
            keyboardType="numeric"
            maxLength={11}
          />

          <InputField
            icon="lock-closed-outline"
            placeholder="Crie uma senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <InputField
            icon="call-outline"
            placeholder="Celular com DDD"
            value={celular}
            onChangeText={setCelular}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Finalizar Cadastro</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 25, paddingBottom: 40, paddingTop: 90 },
  header: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -1 },
  subtitle: { fontSize: 16, color: "#666", marginTop: 8, lineHeight: 22 },
  sectionLabel: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  form: { gap: 12 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", paddingVertical: 15, fontSize: 16 },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    elevation: 8,
  },
  buttonText: { color: "#ffffff", fontWeight: "800", fontSize: 18 },
});
