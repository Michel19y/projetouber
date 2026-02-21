import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

let MapView: any, Marker: any, Polyline: any, PROVIDER_DEFAULT: any;
if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
}

const { width, height } = Dimensions.get('window');

export default function TelaHomePassageiro() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
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
    
    // Estados do Fluxo de Corrida
    const [metodoPagamento, setMetodoPagamento] = useState<'dinheiro' | 'pix'>('dinheiro');
    const [aguardandoMotorista, setAguardandoMotorista] = useState(false);
    const [idCorridaAtual, setIdCorridaAtual] = useState<string | null>(null);

    const mapRef = useRef<any>(null);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
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
                if (status !== 'granted') return;

                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('@user_type');
        router.replace('/(tabs)');
    };

    // Converte coordenadas em texto para o banco de dados
    const getAddressName = async (lat: number, lng: number) => {
        try {
            const r = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
            const d = await r.json();
            return d.features[0]?.properties.name || "Endereço selecionado";
        } catch { return "Endereço via Mapa"; }
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
                mapRef.current?.fitToCoordinates(decoded, { edgePadding: { top: 100, right: 50, bottom: 400, left: 50 }, animated: true });
            }
        } catch (e) { console.error(e); }
    };

    const handleConfirm = async () => {
        if (!location || !destination || !preco) return;
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sessão expirada");

            const originText = await getAddressName(location.latitude, location.longitude);
            const destText = searchText || await getAddressName(destination.latitude, destination.longitude);
            const valorNumeric = parseFloat(preco.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());

            const { data, error } = await supabase.from('rides').insert([{
                passenger_id: session.user.id,
                origin_text: originText,
                destination_text: destText,
                origin_coords: { lat: location.latitude, lng: location.longitude },
                destination_coords: { lat: destination.latitude, lng: destination.longitude },
                distancia: distancia,
                valor: valorNumeric,
                status: 'pendente',
                metodo_pagamento: metodoPagamento
            }]).select().single();

            if (error) throw error;
            
            setIdCorridaAtual(data.id);
            setAguardandoMotorista(true);
        } catch (err: any) {
            Alert.alert('Erro no envio', err.message || 'Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelar = async () => {
        if (!idCorridaAtual) return;
        try {
            await supabase.from('rides').update({ status: 'cancelado' }).eq('id', idCorridaAtual);
            setAguardandoMotorista(false);
            setIdCorridaAtual(null);
            setDestination(null);
            setRouteCoords([]);
            setSearchText('');
        } catch (e) { Alert.alert("Erro", "Erro ao cancelar."); }
    };

    if (loading && !aguardandoMotorista && !location) {
        return <View style={styles.containerCenter}><ActivityIndicator size="large" color="#34C759" /></View>;
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                    latitude: location?.latitude || 0,
                    longitude: location?.longitude || 0,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                customMapStyle={mapDarkStyle}
            >
                {location && (
                    <Marker coordinate={location}>
                        <View style={styles.userMarker}><View style={styles.userMarkerInner} /></View>
                    </Marker>
                )}
                {destination && <Marker coordinate={destination} pinColor="#FF3B30" />}
                {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />}
            </MapView>

            {/* HEADER COM LOGOUT E BUSCA */}
            {!aguardandoMotorista && (
                <View style={[styles.topContainer, { top: insets.top + 10 }]}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.greeting}>Olá, {nome}!</Text>
                            <Text style={styles.subtitle}>Onde vamos hoje?</Text>
                        </View>
                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#666" style={{marginLeft: 15}} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Pesquisar destino..."
                            placeholderTextColor="#999"
                            value={searchText}
                            onChangeText={(t) => {
                                setSearchText(t);
                                if (searchTimer.current) clearTimeout(searchTimer.current);
                                searchTimer.current = setTimeout(() => {
                                    if (t.length > 2) {
                                        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(t)}&lat=${location.latitude}&lon=${location.longitude}&limit=5`)
                                            .then(r => r.json())
                                            .then(d => { if (d.features) setResults(d.features); });
                                    } else { setResults([]); }
                                }, 300);
                            }}
                            onFocus={() => setBuscando(true)}
                        />
                    </View>
                    {buscando && results.length > 0 && (
                        <View style={styles.resultsList}>
                            <ScrollView keyboardShouldPersistTaps="handled">
                                {results.map((item: any, i) => (
                                    <TouchableOpacity key={i} style={styles.resultItem} onPress={() => {
                                        const d = { latitude: item.geometry.coordinates[1], longitude: item.geometry.coordinates[0] };
                                        setDestination(d);
                                        setBuscando(false);
                                        setSearchText(item.properties.name);
                                        calcularRota(location, d);
                                    }}>
                                        <Text style={styles.resultText} numberOfLines={1}>
                                            {item.properties.name} {item.properties.city ? `- ${item.properties.city}` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            )}

            {/* CARD INFERIOR DINÂMICO */}
            <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>
                {aguardandoMotorista ? (
                    <View style={styles.waitingBox}>
                        <ActivityIndicator size="large" color="#34C759" />
                        <Text style={styles.waitingText}>Procurando motoristas...</Text>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelar}>
                            <Text style={styles.cancelBtnText}>CANCELAR CORRIDA</Text>
                        </TouchableOpacity>
                    </View>
                ) : destination ? (
                    <>
                        <View style={styles.estimateBox}>
                            <View style={styles.carIconBox}><Ionicons name="car-sport" size={24} color="#fff" /></View>
                            <View style={{marginLeft: 12, flex: 1}}>
                                <Text style={styles.carType}>Drive E Econômico</Text>
                                <Text style={styles.carTime}>{distancia} • {metodoPagamento.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.price}>{preco}</Text>
                        </View>

                        <View style={styles.paymentRow}>
                            <TouchableOpacity 
                                style={[styles.payBtn, metodoPagamento === 'dinheiro' && styles.payBtnActive]} 
                                onPress={() => setMetodoPagamento('dinheiro')}
                            >
                                <Ionicons name="cash-outline" size={18} color={metodoPagamento === 'dinheiro' ? "#000" : "#fff"} />
                                <Text style={[styles.payTxt, metodoPagamento === 'dinheiro' && styles.payTxtActive]}>Dinheiro</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.payBtn, metodoPagamento === 'pix' && styles.payBtnActive]} 
                                onPress={() => setMetodoPagamento('pix')}
                            >
                                <Ionicons name="qr-code-outline" size={18} color={metodoPagamento === 'pix' ? "#000" : "#fff"} />
                                <Text style={[styles.payTxt, metodoPagamento === 'pix' && styles.payTxtActive]}>PIX</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
                            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.confirmBtnText}>SOLICITAR DRIVE E</Text>}
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.emptyFooter}>
                        <Ionicons name="navigate-circle-outline" size={20} color="#666" />
                        <Text style={styles.emptyText}>Para onde vamos hoje?</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const mapDarkStyle = [ { "elementType": "geometry", "stylers": [ { "color": "#212121" } ] }, { "elementType": "labels.icon", "stylers": [ { "visibility": "off" } ] } ];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    map: { width: width, height: height },
    containerCenter: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    topContainer: { position: 'absolute', left: 20, right: 20, zIndex: 5 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    subtitle: { color: '#888', fontSize: 14 },
    logoutBtn: { backgroundColor: '#222', padding: 10, borderRadius: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, height: 55, elevation: 5 },
    searchInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, color: '#000' },
    resultsList: { backgroundColor: '#fff', marginTop: 5, borderRadius: 15, maxHeight: 200, padding: 10 },
    resultItem: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
    resultText: { color: '#333', fontWeight: '500' },
    bottomCard: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
    estimateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 15, borderRadius: 20, marginBottom: 15 },
    carIconBox: { backgroundColor: '#007AFF', padding: 10, borderRadius: 15 },
    carType: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    carTime: { color: '#888', fontSize: 12 },
    price: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    paymentRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
    payBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
    payTxt: { color: '#fff', marginLeft: 8, fontWeight: 'bold' },
    payTxtActive: { color: '#000' },
    confirmBtn: { backgroundColor: '#34C759', padding: 18, borderRadius: 15, alignItems: 'center' },
    confirmBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
    waitingBox: { alignItems: 'center', paddingVertical: 15 },
    waitingText: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginTop: 15 },
    cancelBtn: { marginTop: 20 },
    cancelBtnText: { color: '#FF3B30', fontWeight: 'bold' },
    emptyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyText: { color: '#666', fontSize: 15 },
    userMarker: { width: 22, height: 22, backgroundColor: 'rgba(0, 122, 255, 0.2)', borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    userMarkerInner: { width: 10, height: 10, backgroundColor: '#007AFF', borderRadius: 5, borderWidth: 2, borderColor: '#fff' }
});