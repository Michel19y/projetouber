import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importação necessária
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function TelaHomeMotorista() {
    const [nome, setNome] = useState<string | null>("Motorista");
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                    router.replace('/(auth)/loginMotorista');
                    return;
                }

                const { data, error } = await supabase
                    .from('motoristas_pretendentes')
                    .select('nome')
                    .eq('email', session.user.email)
                    .maybeSingle();

                if (data && data.nome) {
                    setNome(data.nome);
                }
            } catch (err) {
                console.error("Erro inesperado:", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // FUNÇÃO DE LOGOUT ATUALIZADA
    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            // 1. Apaga a "memória" de que ele era motorista
            await AsyncStorage.removeItem('@user_type'); 
            // 2. Volta para a estaca zero (Tabs inicial)
            router.replace('/(tabs)'); 
        } catch (error) {
            Alert.alert("Erro", "Não foi possível deslogar corretamente.");
        }
    };

    if (loading) {
        return (
            <View style={styles.containerCenter}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {nome}!</Text>
                    <Text style={styles.subtitle}>Parceiro verificado</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={26} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>SALDO TOTAL</Text>
                <Text style={styles.balanceValue}>R$ 1.250,50</Text>
                <View style={styles.balanceStats}>
                    <Text style={styles.statValue}>8 corridas hoje</Text>
                    <Ionicons name="trending-up" size={20} color="#4CD964" />
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.statusBtn, online ? styles.bgOnline : styles.bgOffline]} 
                onPress={() => setOnline(!online)}
            >
                <Text style={styles.statusText}>
                    {online ? "DISPONÍVEL PARA CORRIDAS" : "FICAR ONLINE"}
                </Text>
            </TouchableOpacity>

            {online && (
                <View style={styles.rideAlert}>
                    <Text style={styles.rideType}>CORRIDA DISPONÍVEL</Text>
                    <Text style={styles.rideValue}>R$ 22,50</Text>
                    <Text style={styles.addressText}>Centro - Aeroporto</Text>
                    <TouchableOpacity style={styles.btnAccept} onPress={() => Alert.alert("Sucesso", "Partiu!")}>
                        <Text style={styles.btnAcceptText}>ACEITAR AGORA</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    scrollContent: { padding: 20, paddingTop: 60 },
    containerCenter: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    greeting: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
    subtitle: { color: '#666' },
    logoutBtn: { backgroundColor: '#1a1a1a', padding: 10, borderRadius: 12 },
    balanceCard: { backgroundColor: '#111', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#222' },
    balanceLabel: { color: '#666', fontSize: 12 },
    balanceValue: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
    balanceStats: { flexDirection: 'row', justifyContent: 'space-between' },
    statValue: { color: '#4CD964', fontWeight: 'bold' },
    statusBtn: { padding: 20, borderRadius: 15, marginTop: 20, alignItems: 'center' },
    bgOnline: { backgroundColor: '#4CD964' },
    bgOffline: { backgroundColor: '#007AFF' },
    statusText: { color: '#fff', fontWeight: 'bold' },
    rideAlert: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, marginTop: 20, borderWidth: 1, borderColor: '#007AFF' },
    rideType: { color: '#007AFF', fontSize: 12, fontWeight: 'bold' },
    rideValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginVertical: 5 },
    addressText: { color: '#aaa', marginBottom: 15 },
    btnAccept: { backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center' },
    btnAcceptText: { fontWeight: 'bold' }
});