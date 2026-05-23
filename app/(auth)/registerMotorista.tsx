import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';

const InputField = ({ icon, ...props }: any) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
    <TextInput style={styles.input} placeholderTextColor="#555" {...props} />
  </View>
);

export default function RegisterMotorista() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [celular, setCelular] = useState('');
  const [placa, setPlaca] = useState('');
  const [anoCarro, setAnoCarro] = useState('');
  const [loading, setLoading] = useState(false);

  // --- VALIDAÇÕES MANTIDAS ---
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

  async function handleSignUp() {
    const cpfLimpo = cpf.replace(/\D/g, '');
    const ano = parseInt(anoCarro);

    if (!email || !password || !nome || !placa || !anoCarro || !cpfLimpo) {
      Alert.alert('Campos incompletos', 'Preencha todos os dados.');
      return;
    }

    if (!validarCPF(cpfLimpo)) return Alert.alert('CPF inválido', 'O número de CPF informado não é real.');
    
    setLoading(true);

    try {
      const { data: existente } = await supabase
        .from('motoristas')
        .select('cpf')
        .eq('cpf', cpfLimpo)
        .maybeSingle();

      if (existente) {
        Alert.alert('Aviso', 'esse cpf ja esta no processo de verificação de aprovaãop');
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
        .from('motoristas')
        .insert([{ 
          user_id: authData.user?.id, 
          nome, email, cpf: cpfLimpo, celular, 
         placa: placa.toUpperCase(), ano_carro: ano, status: 'pendente'
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

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      {/* MANTÉM A SETA DE VOLTAR ESTILIZADA */}
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          headerTitle: '', 
          headerTransparent: true, 
          headerTintColor: '#fff' 
        }} 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* HEADER FIXO (Não rola) */}
        <View style={styles.fixedHeader}>
          <Text style={styles.title}>Seja um parceiro</Text>
          <Text style={styles.subtitle}>Preencha os dados para análise.</Text>
        </View>

        {/* ÁREA DE SCROLL (Apenas os campos) */}
        <ScrollView 
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Dados Pessoais</Text>
          <InputField icon="person-outline" placeholder="Nome Completo" value={nome} onChangeText={setNome} />
          <InputField icon="mail-outline" placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <InputField icon="card-outline" placeholder="CPF (somente números)" value={cpf} onChangeText={setCpf} keyboardType="numeric" maxLength={11} />
          <InputField icon="lock-closed-outline" placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
          <InputField icon="call-outline" placeholder="Celular" value={celular} onChangeText={setCelular} keyboardType="phone-pad" maxLength={11} />

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Dados do Veículo</Text>
          <InputField icon="car-outline" placeholder="Placa" value={placa} onChangeText={setPlaca} autoCapitalize="characters" maxLength={7} />
          <InputField icon="calendar-outline" placeholder="Ano do Carro" value={anoCarro} onChangeText={setAnoCarro} keyboardType="numeric" maxLength={4} />
          
          {/* Espaçamento extra para o scroll não bater no botão fixo */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* FOOTER FIXO (Sempre visível no fundo) */}
        <View style={[styles.fixedFooter, { paddingBottom: insets.bottom + 15 }]}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSignUp} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Enviar Cadastro</Text>}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  fixedHeader: { paddingHorizontal: 25, marginTop: 40, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 5 },
  
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 20 },
  
  sectionLabel: { color: '#34C759', fontSize: 13, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' },
  
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#1a1a1a', 
    paddingHorizontal: 15, 
    marginBottom: 12 
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', paddingVertical: 14, fontSize: 16 },
  
  fixedFooter: { 
    paddingHorizontal: 25, 
    paddingTop: 15, 
    backgroundColor: '#000', // Fundo sólido para não ver o texto atrás
    borderTopWidth: 1, 
    borderTopColor: '#111' 
  },
  button: { backgroundColor: '#34C759', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: '800', fontSize: 16 },
});