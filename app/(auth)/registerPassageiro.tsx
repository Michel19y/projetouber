import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function RegisterPassageiro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [celular, setCelular] = useState('');
  const [placa, setPlaca] = useState('');
  const [anoCarro, setAnoCarro] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    const ano = parseInt(anoCarro);
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!email || !password || !nome || !placa || !anoCarro || !cpfLimpo) {
      Alert.alert('Campos incompletos', 'Por favor, preencha todos os dados para prosseguir.');
      return;
    }

    setLoading(true);

    try {
      // Verificação de CPF conforme instrução salva
      const { data: existente, error: checkError } = await supabase
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
        Alert.alert('Veículo não apto', 'Aceitamos apenas veículos fabricados a partir de 2016.');
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nome, type: 'motorista' } }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('motoristas_pretendentes')
        .insert([{ 
          nome, email, cpf: cpfLimpo, celular, placa, 
          ano_carro: ano, situacao: 'pendente' 
        }]);

      if (dbError) throw dbError;

      Alert.alert('Sucesso!', 'Dados enviados para análise. Entraremos em contato em breve.');
      router.replace('/(auth)/loginPassageiro');

    } catch (err: any) {
      Alert.alert('Erro no cadastro', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Componente Reutilizável de Input para manter o código limpo
  const InputField = ({ icon, ...props }: any) => (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
      <TextInput style={styles.input} placeholderTextColor="#555" {...props} />
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Seja um passageiro nosso</Text>
          <Text style={styles.subtitle}>Preencha os dados abaixo para iniciar seu perfil.</Text>
        </View>
        
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Dados Pessoais</Text>
          <InputField icon="person-outline" placeholder="Nome Completo" value={nome} onChangeText={setNome} />
          <InputField icon="mail-outline" placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <InputField icon="card-outline" placeholder="CPF (somente números)" value={cpf} onChangeText={setCpf} keyboardType="numeric" maxLength={11} />
          <InputField icon="lock-closed-outline" placeholder="Crie uma senha" value={password} onChangeText={setPassword} secureTextEntry />
          <InputField icon="call-outline" placeholder="Celular com DDD" value={celular} onChangeText={setCelular} keyboardType="phone-pad" />


          <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Enviar Cadastro</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 25, paddingBottom: 40, paddingTop: 60 },
  header: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8, lineHeight: 22 },
  sectionLabel: { color: '#34C759', fontSize: 14, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  form: { gap: 12 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', paddingVertical: 15, fontSize: 16 },
  button: { 
    backgroundColor: '#34C759', 
    paddingVertical: 18, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 20,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: { color: '#000', fontWeight: '800', fontSize: 18 },
  backButton: { marginTop: 25, alignItems: 'center' },
  backText: { color: '#666', fontSize: 16 },
});