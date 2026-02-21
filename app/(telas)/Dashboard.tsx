import React, { JSX, useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';

// Tipo ajustado conforme sua imagem da tabela (ID é UUID)
type Motorista = {
    id: string;
    nome: string;
    cpf: string;
    celular: string;
    situacao: string;
    email: string;
    placa: string;
    created_at: string;
};

export default function Dashboard(): JSX.Element {
    const router = useRouter();
    const [motoristas, setMotoristas] = useState<Motorista[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [nome, setNome] = useState('');
    const [cpf, setCpf] = useState('');
    const [telefone, setTelefone] = useState('');
    const [status, setStatus] = useState('pendente');
    const [editId, setEditId] = useState<string | null>(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || session.user.user_metadata?.role !== 'admin') {
                router.replace('/(auth)/loginMotorista');
                return;
            }
            await carregarMotoristas();
            setLoading(false);
        };
        checkAdmin();
    }, []);

    async function carregarMotoristas() {
        const { data, error } = await supabase
            .from('motoristas_pretendentes')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setMotoristas(data || []);
    }

    async function salvarMotorista() {
        const sNome = (nome || '').toString().trim();
        const sCpf = (cpf || '').toString().trim();
        const sTel = (telefone || '').toString().trim();

        if (!sNome || !sCpf || !sTel) {
            Alert.alert('Erro', 'Preencha Nome, CPF e Telefone');
            return;
        }

        setIsSubmitting(true);

        // MAPEAR PARA OS NOMES REAIS DA SUA TABELA (IMAGEM 5)
        const dadosParaSalvar = {
            nome: sNome,
            cpf: sCpf,
            celular: sTel,            // Nome na tabela: celular
            situacao: status.toLowerCase(), // Nome na tabela: situacao
            email: `${sNome.split(' ')[0].toLowerCase()}@sistema.com`, // Obrigatório na tabela
            senha: '123',             // Obrigatório na tabela
            placa: 'AAA-0000'         // Obrigatório na tabela
        };

        try {
            let error;
            if (editId) {
                const result = await supabase
                    .from('motoristas_pretendentes')
                    .update(dadosParaSalvar)
                    .eq('id', editId);
                error = result.error;
            } else {
                const result = await supabase
                    .from('motoristas_pretendentes')
                    .insert([dadosParaSalvar]);
                error = result.error;
            }

            if (error) throw error;

            Alert.alert('Sucesso', 'Dados gravados com sucesso!');
            limparFormulario();
            await carregarMotoristas();
        } catch (err: any) {
            console.error("Erro detalhado:", err.message);
            Alert.alert('Erro no Banco', err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function excluirMotorista(id: string) {
        Alert.alert('Confirmar', 'Deseja excluir?', [
            { text: 'Não' },
            { text: 'Sim', onPress: async () => {
                    const { error } = await supabase.from('motoristas_pretendentes').delete().eq('id', id);
                    if (!error) await carregarMotoristas();
                }}
        ]);
    }

    function editarMotorista(m: Motorista) {
        setEditId(m.id);
        setNome(m.nome || '');
        setCpf(m.cpf || '');
        setTelefone(m.celular || ''); // mapeia do banco para o campo telefone
        setStatus(m.situacao || 'pendente'); // mapeia do banco para o campo status
    }

    function limparFormulario() {
        setEditId(null); setNome(''); setCpf(''); setTelefone(''); setStatus('pendente');
    }

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <Text style={styles.title}>Dashboard Admin</Text>

            <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Nome" value={nome} onChangeText={setNome} />
                <TextInput style={styles.input} placeholder="CPF" value={cpf} onChangeText={setCpf} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
                <TextInput style={styles.input} placeholder="Status (pendente/aprovado)" value={status} onChangeText={setStatus} autoCapitalize="none" />

                <TouchableOpacity style={styles.button} onPress={salvarMotorista} disabled={isSubmitting}>
                    <Text style={styles.buttonText}>{isSubmitting ? 'SALVANDO...' : (editId ? 'ATUALIZAR' : 'CADASTRAR NOVO')}</Text>
                </TouchableOpacity>

                {editId && (
                    <TouchableOpacity onPress={limparFormulario} style={[styles.button, {backgroundColor: '#64748b', marginTop: 5}]}>
                        <Text style={styles.buttonText}>CANCELAR</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={motoristas}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                            <Text style={styles.nome}>{item.nome}</Text>
                            <Text style={styles.badge}>{(item.situacao || 'PENDENTE').toUpperCase()}</Text>
                        </View>
                        <Text>CPF: {item.cpf}</Text>
                        <Text>Tel: {item.celular}</Text>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.edit} onPress={() => editarMotorista(item)}>
                                <Text style={{color: '#fff'}}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.delete} onPress={() => excluirMotorista(item.id)}>
                                <Text style={{color: '#fff'}}>Excluir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    form: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 4 },
    input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    button: { backgroundColor: '#2563eb', padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#2563eb', elevation: 2 },
    nome: { fontSize: 16, fontWeight: 'bold' },
    badge: { color: '#2563eb', fontWeight: 'bold', fontSize: 12 },
    actions: { flexDirection: 'row', marginTop: 10 },
    edit: { backgroundColor: '#334155', padding: 8, borderRadius: 6, marginRight: 10 },
    delete: { backgroundColor: '#ef4444', padding: 8, borderRadius: 6 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});