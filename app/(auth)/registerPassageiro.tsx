import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

// Componente de Input reutilizável
const InputField = ({ icon, ...props }: any) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
    <TextInput style={styles.input} placeholderTextColor="#555" {...props} />
  </View>
);

export default function RegisterPassageiro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [celular, setCelular] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Validação básica
    if (!email || !password || !nome || !cpfLimpo) {
      Alert.alert('Campos incompletos', 'Por favor, preencha todos os dados.');
      return;
    }

    setLoading(true);

    try {
      // 1. REGRA DE NEGÓCIO: Verificação de CPF em análise (da memória salva)
      // Se o usuário tenta cadastrar com CPF que já está sendo verificado
      const { data: existente } = await supabase
        .from('motoristas_pretendentes')
        .select('cpf')
        .eq('cpf', cpfLimpo)
        .maybeSingle();

      if (existente) {
        // Mensagem exata solicitada conforme os requisitos salvos
        Alert.alert('Aviso', 'esse cpf ja esta no processo de verificação de aprovaãop');
        setLoading(false);
        return;
      }

      // 2. CADASTRO NO AUTH (Cria a conta de usuário)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: nome, 
            type: 'passageiro' 
          } 
        }
      });

      if (authError) throw authError;

      // 3. INSERÇÃO NA TABELA PASSAGEIROS
      // Só prossegue se o usuário foi criado no Auth com sucesso
      if (authData.user) {
        const { error: dbError } = await supabase
          .from('passageiros')
          .insert([{ 
            id: authData.user.id, 
            nome, 
            email, 
            cpf: cpfLimpo, 
            celular 
          }]);

        if (dbError) {
          // Log detalhado para você ver no terminal por que a tabela rejeitou
          console.error("Erro ao inserir na tabela passageiros:", dbError.message);
          throw new Error("Usuário criado, mas erro ao salvar dados: " + dbError.message);
        }

        Alert.alert('Sucesso!', 'Cadastro realizado com sucesso.');
        
        // Redirecionamento usando a rota absoluta limpa
        router.replace('/passageiroLogado');
      }

    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

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
  title: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8, lineHeight: 22 },
  sectionLabel: { color: '#007AFF', fontSize: 14, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
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
    backgroundColor: '#007AFF', 
    paddingVertical: 18, 
    borderRadius: 14, 
    alignItems: 'center',
    marginTop: 10,
    elevation: 8,
  },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 18 },
});