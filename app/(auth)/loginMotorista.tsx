import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

// ... seus imports permanecem iguais

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
            // 1. Faz o login no Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
                email, 
                password 
            });

            if (authError) {
                notify('Erro no Login', 'E-mail ou senha incorretos.');
                setLoading(false);
                return;
            }

            // 2. Verifica o status na tabela motoristas_pretendentes
            const { data: perfil, error: dbError } = await supabase
                .from('motoristas_pretendentes')
                .select('situacao')
                .eq('email', email)
                .single();

            if (dbError || !perfil) {
                notify('Erro', 'Perfil de motorista não encontrado.');
                await supabase.auth.signOut(); // Desloga por segurança
                setLoading(false);
                return;
            }

            // 3. Regra de Negócio: Verificação de Aprovação
            if (perfil.situacao === 'pendente') {
                notify('Aguardando', 'Seu cadastro ainda está em análise. Avisaremos por e-mail quando for aprovado.');
                await supabase.auth.signOut(); // Bloqueia o acesso às tabs
                setLoading(false);
            } else if (perfil.situacao === 'reprovado') {
                notify('Acesso Negado', 'Infelizmente seu cadastro não foi aprovado.');
                await supabase.auth.signOut();
                setLoading(false);
            } else {
                // APROVADO!
                if (Platform.OS === 'web') window.alert('Login aprovado!');
                router.replace('/(tabs)');
            }

        } catch (err) {
            notify('Erro', 'Ocorreu um erro inesperado.');
            setLoading(false);
        }
    }

    // ... restante do return e styles permanecem iguais
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Ionicons name="key" size={40} color="#007AFF" />
                </View>

                <Text style={styles.title}>Acesse fsua conta</Text>
                <Text style={styles.subtitle}>Olá motorista, que bom ver você novamente!</Text>

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
                            placeholder="Senha"
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
                    <Text style={styles.registerTextNormal}>Não tem conta? </Text>
                    <Text style={styles.registerTextBold}>Cadastre-se aqui</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// Os estilos permanecem os mesmos...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF15',
        justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: '#007AFF30',
    },
    title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
    form: { gap: 15 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, borderWidth: 1, borderColor: '#222', paddingHorizontal: 15 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: '#fff', paddingVertical: 18, fontSize: 16 },
    button: {
        backgroundColor: '#007AFF', paddingVertical: 18, borderRadius: 14, alignItems: 'center',
        marginTop: 10, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    registerLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    registerTextNormal: { color: '#666', fontSize: 15 },
    registerTextBold: { color: '#007AFF', fontSize: 15, fontWeight: 'bold' }
});