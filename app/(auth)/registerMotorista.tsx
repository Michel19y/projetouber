import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

const InputField = ({ icon, ...props }: any) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
    <TextInput style={styles.input} placeholderTextColor="#555" {...props} />
  </View>
);

export default function RegisterMotorista() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [celular, setCelular] = useState('');
  const [placa, setPlaca] = useState('');
  const [anoCarro, setAnoCarro] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- FUNÇÕES DE VALIDAÇÃO REAL ---

  const validarCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cleanCPF.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cleanCPF.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cleanCPF.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cleanCPF.charAt(10))) return false;
    return true;
  };

  const validarEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validarPlaca = (placa: string) => {
    const regexPlaca = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/; // Padrão Mercosul e Antigo
    return regexPlaca.test(placa.toUpperCase());
  };

  const validarCelular = (cel: string) => {
    const cleanCel = cel.replace(/\D/g, '');
    return cleanCel.length >= 10 && cleanCel.length <= 11;
  };

// ... (mantenha os imports e as funções de validação iguais)

  async function handleSignUp() {
    const cpfLimpo = cpf.replace(/\D/g, '');
    const ano = parseInt(anoCarro);

    if (!email || !password || !nome || !placa || !anoCarro || !cpfLimpo) {
      Alert.alert('Campos incompletos', 'Preencha todos os dados.');
      return;
    }

    if (!validarEmail(email)) return Alert.alert('E-mail inválido', 'Digite um e-mail real.');
    if (!validarCPF(cpfLimpo)) return Alert.alert('CPF inválido', 'O número de CPF informado não é real.');
    if (!validarCelular(celular)) return Alert.alert('Celular inválido', 'Informe o DDD + número.');
    if (!validarPlaca(placa)) return Alert.alert('Placa inválida', 'Informe uma placa válida.');
    if (password.length < 6) return Alert.alert('Senha fraca', 'A senha deve ter no mínimo 6 caracteres.');

    setLoading(true);

    try {
      const { data: existente } = await supabase
        .from('motoristas_pretendentes')
        .select('cpf')
        .eq('cpf', cpfLimpo)
        .maybeSingle();

      if (existente) {
        Alert.alert('Aviso', 'esse cpf ja esta no processo de verificação de aprovaãop');
        setLoading(false);
        return;
      }

      if (ano < 2016) {
        Alert.alert('Veículo não apto', 'Aceitamos apenas veículos a partir de 2016.');
        setLoading(false);
        return;
      }

      // 1. Cadastro no Auth (Gera o ID do usuário)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nome, type: 'motorista' } }
      });

      if (authError) throw authError;

      // 2. Inserção na Tabela de Pretendentes com o ID do Auth
      // Adicionamos 'user_id' para que o Trigger saiba quem aprovar depois
      const { error: dbError } = await supabase
        .from('motoristas_pretendentes')
        .insert([{ 
          user_id: authData.user?.id, // Vínculo crucial com o Auth
          nome, 
          email, 
          cpf: cpfLimpo, 
          celular, 
          placa: placa.toUpperCase(), 
          ano_carro: ano, 
          situacao: 'pendente' 
        }]);

      if (dbError) throw dbError;

      Alert.alert('Sucesso!', 'Dados enviados para análise.');
      router.replace('/(auth)/loginMotorista');

    } catch (err: any) {
      Alert.alert('Erro no cadastro', err.message);
    } finally {
      setLoading(false);
    }
  }

// ... (resto do componente e estilos permanecem iguais)

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Seja um parceiro</Text>
          <Text style={styles.subtitle}>Valide seus dados reais para iniciar a análise.</Text>
        </View>
        
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Dados Pessoais</Text>
          <InputField icon="person-outline" placeholder="Nome Completo" value={nome} onChangeText={setNome} />
          <InputField icon="mail-outline" placeholder="E-mail Real" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <InputField icon="card-outline" placeholder="CPF Real (somente números)" value={cpf} onChangeText={setCpf} keyboardType="numeric" maxLength={11} />
          <InputField icon="lock-closed-outline" placeholder="Senha (mín. 6 dígitos)" value={password} onChangeText={setPassword} secureTextEntry />
          <InputField icon="call-outline" placeholder="Celular (Ex: 11999998888)" value={celular} onChangeText={setCelular} keyboardType="phone-pad" maxLength={11} />

          <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Dados do Veículo</Text>
          <InputField icon="car-outline" placeholder="Placa (Ex: ABC1D23)" value={placa} onChangeText={setPlaca} autoCapitalize="characters" maxLength={7} />
          <InputField icon="calendar-outline" placeholder="Ano (A partir de 2016)" value={anoCarro} onChangeText={setAnoCarro} keyboardType="numeric" maxLength={4} />

          <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Enviar Cadastro</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 25, paddingBottom: 40, paddingTop: 60 },
  header: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
  sectionLabel: { color: '#34C759', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  form: { gap: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, borderWidth: 1, borderColor: '#222', paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', paddingVertical: 15, fontSize: 16 },
  button: { backgroundColor: '#34C759', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#000', fontWeight: '800', fontSize: 18 },
});