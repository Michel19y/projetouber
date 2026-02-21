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
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function TelaHomeMotorista() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const mapRef = useRef<MapView>(null);

    const [nome, setNome] = useState<string | null>("Motorista");
    const [loading, setLoading] = useState(true);
    const [online, setOnline] = useState(false);
    const [location, setLocation] = useState<any>(null);
    const [rides, setRides] = useState<any[]>([]);
    const [selectedRide, setSelectedRide] = useState<any>(null);
    const [corridaEmAndamento, setCorridaEmAndamento] = useState<any>(null); 
    
    const [driverToOriginCoords, setDriverToOriginCoords] = useState<any[]>([]);
    const [originToDestCoords, setOriginToDestCoords] = useState<any[]>([]);

    useEffect(() => {
        async function loadData() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { router.replace('/(auth)/loginMotorista'); return; }

                const { data } = await supabase.from('motoristas_pretendentes').select('nome').eq('email', session.user.email).maybeSingle();
                if (data?.nome) setNome(data.nome.split(' ')[0]);

                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        loadData();
    }, []);

    // Lógica de monitoramento de corridas
    useEffect(() => {
        // Se estiver offline ou JÁ estiver em uma corrida, não busca nada novo
        if (!online || corridaEmAndamento) {
            setRides([]);
            return;
        }

        const fetchPendentRides = async () => {
            const { data } = await supabase.from('rides').select('*').eq('status', 'pendente').is('driver_id', null);
            setRides(data || []);
        };

        fetchPendentRides();

        const channel = supabase.channel('rides-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, (p) => {
                if (p.new.status === 'pendente') setRides(prev => [...prev, p.new]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rides' }, (p) => {
                setRides(prev => prev.filter(r => r.id !== p.old.id));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [online, corridaEmAndamento]);

    const decodePolyline = (encoded: string) => {
        let points = []; let index = 0, len = encoded.length; let lat = 0, lng = 0;
        while (index < len) {
            let b, shift = 0, result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
            shift = 0; result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
            points.push({ latitude: (lat / 1E5), longitude: (lng / 1E5) });
        }
        return points;
    };

    const traçarRota = async (ride: any) => {
        if (!location) return;
        try {
            const [res1, res2] = await Promise.all([
                fetch(`https://router.project-osrm.org/route/v1/driving/${location.longitude},${location.latitude};${ride.origin_coords.lng},${ride.origin_coords.lat}?overview=full&geometries=polyline`),
                fetch(`https://router.project-osrm.org/route/v1/driving/${ride.origin_coords.lng},${ride.origin_coords.lat};${ride.destination_coords.lng},${ride.destination_coords.lat}?overview=full&geometries=polyline`)
            ]);
            const [d1, d2] = await Promise.all([res1.json(), res2.json()]);

            const p1 = decodePolyline(d1.routes[0].geometry);
            const p2 = decodePolyline(d2.routes[0].geometry);

            setDriverToOriginCoords(p1);
            setOriginToDestCoords(p2);
            
            mapRef.current?.fitToCoordinates([...p1, ...p2], { 
                edgePadding: { top: 80, right: 50, bottom: 450, left: 50 }, 
                animated: true 
            });
        } catch (e) { console.error("Erro ao traçar rota"); }
    };

    const handleAcceptRide = async () => {
        if (!selectedRide) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { error } = await supabase.from('rides').update({ 
                driver_id: session?.user.id, 
                status: 'aceita' 
            }).eq('id', selectedRide.id);

            if (error) throw error;
            
            // Prioridade Total: Limpa tudo e foca na corrida
            setCorridaEmAndamento(selectedRide);
            setSelectedRide(null);
            setRides([]); 
        } catch (err) { 
            Alert.alert('Indisponível', 'Esta corrida já foi aceita ou cancelada.'); 
            setSelectedRide(null);
            setDriverToOriginCoords([]);
            setOriginToDestCoords([]);
        }
    };

    const finalizarCorrida = async () => {
        Alert.alert("Finalizar", "O passageiro chegou ao destino?", [
            { text: "Não" },
            { text: "Sim", onPress: async () => {
                // Aqui você pode adicionar um update no banco para status='finalizada'
                setCorridaEmAndamento(null);
                setDriverToOriginCoords([]);
                setOriginToDestCoords([]);
                setOnline(true); // Volta a ficar disponível
            }}
        ]);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('@user_type');
        router.replace('/(tabs)');
    };

    if (loading || !location) return <View style={styles.containerCenter}><ActivityIndicator size="large" color="#007AFF" /></View>;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Stack.Screen options={{ headerShown: false }} />

            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                customMapStyle={mapDarkStyle}
            >
                {/* Motorista */}
                <Marker coordinate={location}>
                    <View style={styles.driverMarker}><Ionicons name="car" size={20} color="#fff" /></View>
                </Marker>

                {/* Só mostra outras se não houver prioridade atual */}
                {!corridaEmAndamento && rides.map(ride => (
                    <Marker 
                        key={ride.id} 
                        coordinate={{ latitude: ride.origin_coords.lat, longitude: ride.origin_coords.lng }} 
                        onPress={() => { setSelectedRide(ride); traçarRota(ride); }}
                    >
                        <View style={styles.rideMarker}><Text style={styles.rideMarkerText}>R$</Text></View>
                    </Marker>
                ))}

                {/* Desenho das Rotas */}
                {driverToOriginCoords.length > 0 && <Polyline coordinates={driverToOriginCoords} strokeWidth={4} strokeColor="#00BFFF" lineDashPattern={[5, 5]} />}
                {originToDestCoords.length > 0 && <Polyline coordinates={originToDestCoords} strokeWidth={6} strokeColor="#007AFF" />}
            </MapView>

            {/* Cabeçalho superior (Oculto durante corrida) */}
            {!corridaEmAndamento && (
                <View style={[styles.topContainer, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.greeting}>Olá, {nome}</Text>
                            <Text style={styles.onlineBadge}>{online ? "● Online" : "○ Offline"}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity 
                        style={[styles.statusBtn, online ? styles.bgOnline : styles.bgOffline]} 
                        onPress={() => { setOnline(!online); if(online) setSelectedRide(null); }}
                    >
                        <Text style={styles.statusText}>{online ? "PAUSAR RECEBIMENTO" : "FICAR DISPONÍVEL"}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Interface Inferior (Wrapper Dinâmico) */}
            <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + 10 }]}>
                
                {/* 1. LISTA DE CORRIDAS DISPONÍVEIS */}
                {online && !selectedRide && !corridaEmAndamento && (
                    <ScrollView style={styles.ridesList} showsVerticalScrollIndicator={false}>
                        <Text style={styles.listTitle}>{rides.length} CHAMADAS AGORA</Text>
                        {rides.map((ride) => (
                            <TouchableOpacity key={ride.id} style={styles.rideItem} onPress={() => { setSelectedRide(ride); traçarRota(ride); }}>
                                <View style={styles.ridePriceBadge}><Text style={styles.rideItemValue}>R$ {(ride.valor * 0.9).toFixed(2)}</Text></View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.rideItemAddr} numberOfLines={1}>{ride.origin_text}</Text>
                                    <Text style={styles.rideItemDist}>{ride.distancia}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#444" />
                            </TouchableOpacity>
                        ))}
                        {rides.length === 0 && <Text style={styles.noRides}>Aguardando novas solicitações...</Text>}
                    </ScrollView>
                )}

                {/* 2. CARD DE INSPEÇÃO (Antes de aceitar) */}
                {selectedRide && !corridaEmAndamento && (
                    <View style={styles.bottomCard}>
                        <View style={styles.dragHandle} />
                        <Text style={styles.rideLabel}>GANHO LÍQUIDO ESTIMADO</Text>
                        <Text style={styles.rideValue}>R$ {(selectedRide.valor * 0.9).toFixed(2)}</Text>
                        
                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={16} color="#00BFFF" />
                            <Text style={styles.addressText} numberOfLines={2}>Embarque: {selectedRide.origin_text}</Text>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => { setSelectedRide(null); setDriverToOriginCoords([]); setOriginToDestCoords([]); }}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnAccept} onPress={handleAcceptRide}>
                                <Text style={styles.btnAcceptText}>ACEITAR CORRIDA</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* 3. CARD DE PRIORIDADE (Corrida em andamento) */}
                {corridaEmAndamento && (
                    <View style={[styles.bottomCard, { borderTopColor: '#34C759', borderTopWidth: 3 }]}>
                        <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>EM VIAGEM ATIVA</Text></View>
                        <Text style={styles.rideValue}>R$ {(corridaEmAndamento.valor * 0.9).toFixed(2)}</Text>
                        
                        <View style={styles.destinationBox}>
                            <Text style={styles.destTitle}>DESTINO DO PASSAGEIRO</Text>
                            <Text style={styles.destAddr}>{corridaEmAndamento.destination_text}</Text>
                        </View>

                        <TouchableOpacity style={styles.btnFinish} onPress={finalizarCorrida}>
                            <Text style={styles.btnFinishText}>FINALIZAR E RECEBER</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const mapDarkStyle = [{ "elementType": "geometry", "stylers": [{ "color": "#212121" }] }, { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    map: { width: width, height: height },
    containerCenter: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    
    // Top UI
    topContainer: { position: 'absolute', left: 20, right: 20, zIndex: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    onlineBadge: { color: '#34C759', fontSize: 12, fontWeight: 'bold' },
    profileBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 20 },
    statusBtn: { padding: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    bgOnline: { backgroundColor: '#FF3B30' }, // Se tá online, botão é vermelho para "Pausar"
    bgOffline: { backgroundColor: '#34C759' }, // Se tá offline, botão é verde para "Ficar Disponível"
    statusText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },

    // Bottom UI Wrapper
    bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', zIndex: 11 },
    
    // Lista de Corridas
    ridesList: { maxHeight: 300, backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderTopWidth: 1, borderTopColor: '#222' },
    listTitle: { color: '#555', fontSize: 11, fontWeight: 'bold', marginBottom: 15 },
    rideItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1c', padding: 14, borderRadius: 18, marginBottom: 10 },
    ridePriceBadge: { backgroundColor: '#222', padding: 10, borderRadius: 12 },
    rideItemValue: { color: '#34C759', fontWeight: 'bold', fontSize: 15 },
    rideItemAddr: { color: '#fff', fontSize: 14, fontWeight: '500' },
    rideItemDist: { color: '#666', fontSize: 12 },
    noRides: { color: '#444', textAlign: 'center', marginTop: 20, fontSize: 13 },

    // Cards
    bottomCard: { backgroundColor: '#111', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, shadowColor: '#000', shadowRadius: 10, elevation: 20 },
    dragHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    rideLabel: { color: '#007AFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
    rideValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25, paddingHorizontal: 20 },
    addressText: { color: '#bbb', fontSize: 15, marginLeft: 8, textAlign: 'center' },
    
    // Ações
    actionRow: { flexDirection: 'row', gap: 15 },
    btnAccept: { flex: 4, backgroundColor: '#fff', padding: 20, borderRadius: 22, alignItems: 'center' },
    btnAcceptText: { color: '#000', fontWeight: 'bold', fontSize: 17 },
    btnCancel: { flex: 1, backgroundColor: '#222', padding: 20, borderRadius: 22, alignItems: 'center' },
    
    // Trip Ativa
    activeBadge: { backgroundColor: 'rgba(52, 199, 89, 0.1)', alignSelf: 'center', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginBottom: 10 },
    activeBadgeText: { color: '#34C759', fontSize: 11, fontWeight: 'bold' },
    destinationBox: { backgroundColor: '#1c1c1c', padding: 20, borderRadius: 20, marginBottom: 25 },
    destTitle: { color: '#555', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
    destAddr: { color: '#fff', fontSize: 16, fontWeight: '500' },
    btnFinish: { backgroundColor: '#34C759', padding: 22, borderRadius: 22, alignItems: 'center' },
    btnFinishText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

    // Markers
    driverMarker: { backgroundColor: '#007AFF', padding: 8, borderRadius: 25, borderWidth: 3, borderColor: '#fff' },
    rideMarker: { backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
    rideMarkerText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});