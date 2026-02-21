import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function TelaHomePassageiroWeb() {
    const [nome, setNome] = useState<string | null>("Passageiro");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/(auth)/loginPassageiro');
                return;
            }
            const { data } = await supabase.from('passageiros').select('nome').eq('id', session.user.id).maybeSingle();
            if (data?.nome) setNome(data.nome.split(' ')[0]);
            setLoading(false);
        })();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('@user_type');
        router.replace('/(tabs)');
    };

    if (loading) return <View style={styles.containerCenter}><ActivityIndicator size="large" color="#007AFF" /></View>;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Placeholder do Mapa para Web */}
            <View style={[styles.map, styles.containerCenter, { backgroundColor: '#121212' }]}>
                <Ionicons name="map-outline" size={80} color="#333" />
                <Text style={{color: '#666', marginTop: 15, fontSize: 18}}>Modo Web Ativo</Text>
                <Text style={{color: '#444'}}>O mapa nativo só está disponível no App.</Text>
            </View>

            <View style={styles.topContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.greeting}>Olá, {nome}!</Text>
                    <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={styles.searchBar}>
                    <TextInput style={styles.searchInput} placeholder="Para onde vamos? (Apenas App)" editable={false} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    map: { width: width, height: height },
    containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topContainer: { position: 'absolute', top: 50, left: 20, right: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    profileBtn: { backgroundColor: '#333', padding: 10, borderRadius: 20 },
    searchBar: { backgroundColor: '#222', borderRadius: 10, marginTop: 15, paddingHorizontal: 15, height: 50, justifyContent: 'center' },
    searchInput: { fontSize: 16, color: '#555' }
});