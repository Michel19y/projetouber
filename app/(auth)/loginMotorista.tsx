import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importado para salvar a memória do perfil
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function LoginMotorista() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const notify = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    async function handleLogin() {
        if (!email || !password) {
            notify('Atenção', 'Preencha todos os campos para entrar.');
            return;
        }

        setLoading(true);

        try {
            // 1. AUTENTICAÇÃO OFICIAL
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
                email, 
                password 
            });

            if (authError) {
                notify('Erro no Login', 'E-mail ou senha incorretos.');
                setLoading(false);
                return;
            }

            // 2. VERIFICAÇÃO DE STATUS NA TABELA motoristas_pretendentes
            const { data: pretendente, error: dbError } = await supabase
                .from('motoristas_pretendentes')
                .select('situacao')
                .eq('email', email)
                .single();

            if (dbError || !pretendente) {
                notify('Erro', 'Vínculo de motorista não encontrado.');
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            // 3. REGRA DE NEGÓCIO E REDIRECIONAMENTO INTELIGENTE
            if (pretendente.situacao === 'pendente') {
                notify('Aguardando', 'Seu cadastro está em análise. Verifique novamente em breve.');
                await supabase.auth.signOut(); 
                setLoading(false);
            } else if (pretendente.situacao === 'reprovado') {
                notify('Acesso Negado', 'Seu cadastro foi reprovado pela administração.');
                await supabase.auth.signOut();
                setLoading(false);
            } else if (pretendente.situacao === 'aprovado') {
                
                // --- AQUI ESTÁ A CHAVE DA LÓGICA ---
                // Salva que o último perfil logado neste celular foi o de MOTORISTA
                await AsyncStorage.setItem('@user_type', 'motorista');
                
                if (Platform.OS === 'web') window.alert('Login aprovado!');
                
                // Manda direto para a tela interna (conforme o RootLayout agora espera)
               // No LoginMotorista.tsx, altere para:
router.replace({ pathname: '/(telas)/motoristaLogado' });
            }

        } catch (err) {
            notify('Erro', 'Ocorreu um erro inesperado.');
            setLoading(false);
        }
    }

    // ... (restante do código JSX e Styles permanece o mesmo)
    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Ionicons name="key" size={40} color="#1eb318" />
                </View>

                <Text style={styles.title}>Acesse sua conta</Text>
                <Text style={styles.subtitle}>Olá motorista, sua senha do perfil será validada.</Text>
                
                <View style={styles.form}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
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
                        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Senha do Perfil" 
                            placeholderTextColor="#555" 
                            value={password} 
                            onChangeText={setPassword} 
                            secureTextEntry 
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={styles.registerLink} 
                    onPress={() => router.push('/(auth)/registerMotorista')}
                >
                    <Text style={styles.registerTextNormal}>Novo por aqui? </Text>
                    <Text style={styles.registerTextBold}>Criar cadastro de motorista</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#1ac22815',
        justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: '#21b84730',
    },
    title: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40 },
    form: { gap: 15 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, borderWidth: 1, borderColor: '#222', paddingHorizontal: 15 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: '#fff', paddingVertical: 18, fontSize: 16 },
    button: { backgroundColor: '#1eb318', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    registerLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    registerTextNormal: { color: '#666', fontSize: 15 },
    registerTextBold: { color: '#34C759', fontSize: 15, fontWeight: 'bold' }
});