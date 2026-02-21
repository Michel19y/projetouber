import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router'; // Importado Stack para controle do header
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
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../src/lib/supabase';

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
    
    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace('/(auth)/loginPassageiro');
                    return;
                }

                const { data } = await supabase
                    .from('passageiros')
                    .select('nome')
                    .eq('id', session.user.id)
                    .maybeSingle();
                
                if (data?.nome) setNome(data.nome.split(' ')[0]);

                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permissão Necessária', 'Ative a localização para usar o app.');
                    return;
                }

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
        try {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('@user_type');
            router.replace('/(tabs)');
        } catch (error) {
            Alert.alert("Erro", "Não foi possível deslogar.");
        }
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

                mapRef.current?.fitToCoordinates(decoded, {
                    edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
                    animated: true,
                });
            }
        } catch (e) { 
            Alert.alert("Erro", "Falha ao traçar rota."); 
        }
    };

    const handleMapPress = async (e: any) => {
        const coords = e.nativeEvent.coordinate;
        setDestination(coords);
        setBuscando(false);
        if (location) await calcularRota(location, coords);
    };

    if (loading || !location) return <View style={styles.containerCenter}><ActivityIndicator size="large" color="#007AFF" /></View>;

    return (
        <View style={styles.container}>
            {/* OCULTAR SETA/HEADER AUTOMÁTICO */}
            <Stack.Screen options={{ headerShown: false }} />

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
                onPress={handleMapPress}
                customMapStyle={mapDarkStyle}
            >
                <Marker coordinate={location}>
                    <View style={styles.userMarker}><View style={styles.userMarkerInner} /></View>
                </Marker>
                {destination && <Marker coordinate={destination} pinColor="#FF3B30" />}
                
                {routeCoords && routeCoords.length > 0 && (
                    <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />
                )}
            </MapView>

            <View style={styles.topContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.greeting}>Olá, {nome}!</Text>
                        <Text style={styles.subtitle}>Para onde vamos?</Text>
                    </View>
                    <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
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
                                    fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(t)}&limit=5`)
                                        .then(r => r.json())
                                        .then(d => { if (d.features) setResults(d.features); else setResults([]); })
                                        .catch(() => setResults([]));
                                } else {
                                    setResults([]);
                                }
                            }, 300);
                        }}
                        onFocus={() => setBuscando(true)}
                    />
                </View>

                {buscando && results && results.length > 0 && (
                    <View style={styles.resultsList}>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            {results.map((item, i) => (
                                <TouchableOpacity key={i} style={styles.resultItem} onPress={() => {
                                    const d = { latitude: item.geometry.coordinates[1], longitude: item.geometry.coordinates[0] };
                                    setDestination(d);
                                    setBuscando(false);
                                    setSearchText(item.properties.name);
                                    calcularRota(location, d);
                                }}>
                                    <Ionicons name="location-outline" size={18} color="#666" />
                                    <Text style={styles.resultText} numberOfLines={1}>
                                        {item.properties.name}, {item.properties.city || ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            <View style={destination ? styles.bottomCard : styles.footerBar}>
                {destination ? (
                    <>
                        <View style={styles.dragHandle} />
                        <View style={styles.estimateBox}>
                            <View style={styles.carIconBox}><Ionicons name="car-sport" size={24} color="#fff" /></View>
                            <View style={{marginLeft: 12, flex: 1}}>
                                <Text style={styles.carType}>Drive E Econômico</Text>
                                <Text style={styles.carTime}>{distancia} • Rápido</Text>
                            </View>
                            <Text style={styles.price}>{preco}</Text>
                        </View>
                        <TouchableOpacity style={styles.confirmBtn} onPress={() => Alert.alert('Confirmado!', 'Corrida solicitada.')}>
                            <Text style={styles.confirmBtnText}>CONFIRMAR DRIVE E</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.footerInfo}>
                        <View style={styles.infoItem}>
                            <Ionicons name="shield-checkmark" size={18} color="#34C759" />
                            <Text style={styles.infoText}>Segurança 24h</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="card" size={18} color="#007AFF" />
                            <Text style={styles.infoText}>Pagamento no App</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const mapDarkStyle = [ { "elementType": "geometry", "stylers": [ { "color": "#212121" } ] }, { "elementType": "labels.icon", "stylers": [ { "visibility": "off" } ] }, { "elementType": "labels.text.fill", "stylers": [ { "color": "#757575" } ] }, { "elementType": "labels.text.stroke", "stylers": [ { "color": "#212121" } ] }, { "featureType": "road", "elementType": "geometry.fill", "stylers": [ { "color": "#2c2c2c" } ] }, { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#000000" } ] } ];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    map: { width: width, height: height },
    containerCenter: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
    topContainer: { position: 'absolute', top: 50, left: 20, right: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    subtitle: { color: '#bbb', fontSize: 14 },
    profileBtn: { backgroundColor: '#333', padding: 12, borderRadius: 25 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, height: 55 },
    searchInput: { flex: 1, paddingHorizontal: 15, fontSize: 16 },
    resultsList: { backgroundColor: '#fff', marginTop: 5, borderRadius: 15, maxHeight: 200, padding: 10 },
    resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
    resultText: { marginLeft: 10, color: '#333', fontWeight: '500' },
    footerBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#000', padding: 25, borderTopWidth: 1, borderTopColor: '#222' },
    footerInfo: { flexDirection: 'row', justifyContent: 'space-around' },
    infoItem: { flexDirection: 'row', alignItems: 'center' },
    infoText: { color: '#fff', marginLeft: 8, fontSize: 13 },
    bottomCard: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 40 },
    dragHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    estimateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 15, borderRadius: 20, marginBottom: 20 },
    carIconBox: { backgroundColor: '#007AFF', padding: 10, borderRadius: 15 },
    carType: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    carTime: { color: '#888', fontSize: 12 },
    price: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    confirmBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 15, alignItems: 'center' },
    confirmBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
    userMarker: { width: 24, height: 24, backgroundColor: 'rgba(0, 122, 255, 0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    userMarkerInner: { width: 10, height: 10, backgroundColor: '#007AFF', borderRadius: 5, borderColor: '#fff', borderWidth: 2 }
});