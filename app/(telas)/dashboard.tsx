import { supabase } from '@/src/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { JSX, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList,
    ScrollView,
    StatusBar, StyleSheet, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';

// Tipagem baseada nos dados reais que você enviou
type TableType = 'motoristas_pretendentes' | 'motoristas_ativos' | 'profiles' | 'rides' | 'passageiros';

export default function Dashboard(): JSX.Element {
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [currentTable, setCurrentTable] = useState<TableType>('motoristas_pretendentes');
    const [loading, setLoading] = useState(true);
    
    // Form states (Principais para motoristas_pretendentes)
    const [nome, setNome] = useState('');
    const [cpf, setCpf] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        fetchData();
    }, [currentTable]);

    async function fetchData() {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        
        // Verifica admin
        if (!sessionData.session || sessionData.session.user.user_metadata?.role !== 'admin') {
            router.replace('/(auth)/loginMotorista');
            return;
        }

        const { data: result, error } = await supabase
            .from(currentTable)
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setData(result || []);
        setLoading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('@user_type');
        router.replace('/(tabs)');
    }

    async function handleSavePretendente() {
        if (!nome || !cpf || !email) return Alert.alert('Erro', 'Preencha os campos obrigatórios');

        // REGRA SALVA: Verificar CPF na tabela de verificação
        const { data: existe } = await supabase
            .from('motoristas_pretendentes')
            .select('cpf')
            .eq('cpf', cpf)
            .single();

        if (existe) {
            Alert.alert('Aviso', 'esse cpf ja esta no processo de verificação de aprovação');
            return;
        }

        const { error } = await supabase.from('motoristas_pretendentes').insert([{
            nome, cpf, email, celular: '000', placa: 'AAA-0000', ano_carro: 2000, situacao: 'pendente'
        }]);

        if (!error) {
            Alert.alert('Sucesso', 'Cadastrado com sucesso');
            setNome(''); setCpf(''); setEmail('');
            fetchData();
        }
    }

    async function deleteItem(id: string) {
        Alert.alert('Confirmar', 'Excluir este registro?', [
            { text: 'Cancelar' },
            { text: 'Excluir', onPress: async () => {
                const { error } = await supabase.from(currentTable).delete().eq('id', id);
                if (!error) fetchData();
            }}
        ]);
    }

    // Renderizador Inteligente: Mostra dados diferentes por tabela
    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                {/* Nome/Título dinâmico */}
                <Text style={styles.cardTitle}>
                    {item.nome || item.full_name || item.username || `Corrida: ${item.id.substring(0,8)}`}
                </Text>

                {/* Detalhes dinâmicos conforme a tabela */}
                <Text style={styles.cardInfo}>
                    {item.cpf && `CPF: ${item.cpf}`}
                    {item.placa && `Placa: ${item.placa}`}
                    {item.origin_text && `De: ${item.origin_text.substring(0,20)}...`}
                    {item.valor && `Valor: R$ ${item.valor}`}
                </Text>

                <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: item.online || item.status === 'completed' ? '#4ade80' : '#FF9500' }]} />
                    <Text style={styles.statusText}>
                        {(item.situacao || item.status || (item.online ? 'Online' : 'Offline')).toUpperCase()}
                    </Text>
                </View>
            </View>

            <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>EXCLUIR</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            <View style={styles.header}>
                <View>
                    <Text style={styles.mainTitle}>Master Admin</Text>
                    <Text style={styles.subtitle}>Gerenciando: {currentTable}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={{ color: '#fff', fontSize: 12 }}>SAIR</Text>
                </TouchableOpacity>
            </View>

            {/* Menu de Tabelas (Horizontal) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsHolder}>
                {(['motoristas_pretendentes', 'motoristas_ativos', 'passageiros', 'rides', 'profiles'] as TableType[]).map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        onPress={() => setCurrentTable(tab)}
                        style={[styles.tab, currentTable === tab && styles.tabActive]}
                    >
                        <Text style={[styles.tabText, currentTable === tab && { color: '#000' }]}>
                            {tab.replace('_', ' ').toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Form de Cadastro Rápido (Apenas para pretendentes) */}
            {currentTable === 'motoristas_pretendentes' && (
                <View style={styles.form}>
                    <TextInput placeholder="Nome" value={nome} onChangeText={setNome} placeholderTextColor="#666" style={styles.input} />
                    <TextInput placeholder="CPF" value={cpf} onChangeText={setCpf} placeholderTextColor="#666" style={styles.input} keyboardType="numeric" />
                    <TextInput placeholder="Email" value={email} onChangeText={setEmail} placeholderTextColor="#666" style={styles.input} autoCapitalize="none" />
                    <TouchableOpacity onPress={handleSavePretendente} style={styles.saveBtn}>
                        <Text style={styles.saveBtnText}>ADICIONAR PRETENDENTE</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#FF9500" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListEmptyComponent={<Text style={styles.empty}>Nenhum registro encontrado.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20, paddingTop: 60 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    mainTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -1 },
    subtitle: { fontSize: 14, color: '#FF9500', fontWeight: '600' },
    logoutBtn: { backgroundColor: '#1a1a1a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
    tabsHolder: { maxHeight: 45, marginBottom: 20 },
    tab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: '#111', marginRight: 10, height: 35, borderWidth: 1, borderColor: '#222' },
    tabActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
    tabText: { color: '#666', fontWeight: '700', fontSize: 11 },
    form: { backgroundColor: '#111', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
    input: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 10, borderWidth: 1, borderColor: '#222' },
    saveBtn: { backgroundColor: '#FF9500', padding: 15, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { fontWeight: '800', color: '#000', fontSize: 12 },
    card: { backgroundColor: '#111', padding: 18, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    cardInfo: { color: '#888', fontSize: 13, marginTop: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    deleteBtn: { padding: 10 },
    empty: { color: '#444', textAlign: 'center', marginTop: 50, fontWeight: '600' }
});