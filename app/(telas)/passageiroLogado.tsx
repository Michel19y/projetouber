import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform
} from 'react-native';
import { supabase } from '../../src/lib/supabase';

// Criamos variáveis globais vazias para não quebrar a referência no JSX
let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;
let PROVIDER_DEFAULT: any = null;

const { width, height } = Dimensions.get('window');

export default function TelaHomePassageiro() {
    const [nome, setNome] = useState<string | null>("Passageiro");
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<any>(null);
    const [destination, setDestination] = useState<any>(null);
    const [routeCoords, setRouteCoords] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [distancia, setDistancia] = useState<string | null>(null);
    const [preco, setPreco] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [buscando, setBuscando] = useState(false);

    const mapRef = useRef<any>(null);
    const router = useRouter();
    const searchTimer = useRef<any>(null);

    useEffect(() => {
        // --- O PULO DO GATO ---
        // O require() dentro do useEffect esconde a biblioteca do compilador Web
        if (Platform.OS !== 'web') {
            try {
                const Maps = require('react-native-maps');
                MapView = Maps.default;
                Marker = Maps.Marker;
                Polyline = Maps.Polyline;
                PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
            } catch (e) {
                console.warn("Falha ao carregar mapas nativos");
            }
        }

        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace('/(auth)/loginPassageiro');
                    return;
                }

                const { data } = await supabase.from('passageiros').select('nome').eq('id', session.user.id).maybeSingle();
                if (data?.nome) setNome(data.nome.split(' ')[0]);

                let { status } = await Location.requestForegroundPermissionsAsync();
                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
            } catch (err) {
                setLocation({ latitude: -23.5505, longitude: -46.6333 }); // Fallback SP
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ... (Funções decodePolyline e calcularRota permanecem as mesmas)
    const handleLogout = async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('@user_type');
        router.replace('/(tabs)');
    };

    function decodePolyline(encoded: string) {
        let points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;
        while (index < len) {
            let b, shift = 0, result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
            shift = 0; result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
            points.push({ latitude: (lat / 1E5), longitude: (lng / 1E5) });
        }
        return points;
    }

    const calcularRota = async (origem: any, destino: any) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}?overview=full&geometries=polyline`;
            const response = await fetch(url);
            const data = await response.json();
            if (data?.routes?.length > 0) {
                const route = data.routes[0];
                const decoded = decodePolyline(route.geometry);
                setRouteCoords(decoded);
                const distKm = route.distance / 1000;
                setDistancia(distKm.toFixed(1) + " km");
                setPreco(((distKm * 2.80) + 5).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                if (Platform.OS !== 'web' && mapRef.current) {
                    mapRef.current.fitToCoordinates(decoded, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
                }
            }
        } catch (e) { console.log(e); }
    };

    if (loading || !location) return <View style={styles.containerCenter}><ActivityIndicator size="large" color="#007AFF" /></View>;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {Platform.OS === 'web' ? (
                <View style={[styles.map, styles.containerCenter, { backgroundColor: '#121212' }]}>
                    <Ionicons name="navigate-circle" size={80} color="#333" />
                    <Text style={{color: '#666', marginTop: 10}}>Mapa disponível apenas no dispositivo móvel</Text>
                </View>
            ) : (
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    onPress={(e: any) => {
                        const coords = e.nativeEvent.coordinate;
                        setDestination(coords);
                        setBuscando(false);
                        calcularRota(location, coords);
                    }}
                >
                    <Marker coordinate={location} />
                    {destination && <Marker coordinate={destination} pinColor="red" />}
                    {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />}
                </MapView>
            )}

            {/* Interface de busca e cards permanecem aqui... */}
            <View style={styles.topContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.greeting}>Olá, {nome}!</Text>
                    <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Para onde vamos?"
                        value={searchText}
                        onChangeText={setSearchText}
                        onFocus={() => setBuscando(true)}
                    />
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
    searchBar: { backgroundColor: '#fff', borderRadius: 10, marginTop: 15, paddingHorizontal: 15, height: 50, justifyContent: 'center' },
    searchInput: { fontSize: 16 }
});