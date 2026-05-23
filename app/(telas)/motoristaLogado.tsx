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
// para:
import MapView, { Marker, Polyline } from '@/components/MapViewMock';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decodePolyline, mapsApi, ridesApi } from '../../src/lib/api';
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
    const [aceitandoCorrida, setAceitandoCorrida] = useState(false);
    const [finalizandoCorrida, setFinalizandoCorrida] = useState(false);

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

    // O Realtime do Supabase permanece no cliente — é seguro pois apenas lê corridas pendentes
    useEffect(() => {
        if (!online || corridaEmAndamento) {
            setRides([]);
            return;
        }

        const fetchPendingRides = async () => {
            const { data } = await supabase.from('rides').select('*').eq('status', 'pendente').is('driver_id', null);
            setRides(data || []);
        };

        fetchPendingRides();

        const channel = supabase.channel('rides-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, (p) => {
                if (p.new.status === 'pendente') setRides(prev => [...prev, p.new]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides' }, (p) => {
                // Remove da lista se foi aceita/cancelada por outro motorista
                if (p.new.status !== 'pendente') {
                    setRides(prev => prev.filter(r => r.id !== p.new.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [online, corridaEmAndamento]);

    // ✅ Rotas calculadas pelo Backend (não expõe OSRM ao cliente)
    const traçarRota = async (ride: any) => {
        if (!location) return;
        try {
            const data = await mapsApi.rotaMotorista(
                location.latitude, location.longitude,
                ride.origin_coords.lat, ride.origin_coords.lng,
                ride.destination_coords.lat, ride.destination_coords.lng
            );

            const p1 = decodePolyline(data.rotaAtendimento.geometry);
            const p2 = decodePolyline(data.rotaViagem.geometry);

            setDriverToOriginCoords(p1);
            setOriginToDestCoords(p2);

            mapRef.current?.fitToCoordinates([...p1, ...p2], {
                edgePadding: { top: 80, right: 50, bottom: 450, left: 50 },
                animated: true,
            });
        } catch (e) { console.error("Erro ao traçar rota:", e); }
    };

    // ✅ Aceitar corrida via Backend (atomicidade e verificação de owner server-side)
    const handleAcceptRide = async () => {
        if (!selectedRide) return;
        setAceitandoCorrida(true);
        try {
            await ridesApi.aceitar(selectedRide.id);
            setCorridaEmAndamento(selectedRide);
            setSelectedRide(null);
            setRides([]);
        } catch (err: any) {
            Alert.alert('Indisponível', err.message || 'Esta corrida já foi aceita ou cancelada.');
            setSelectedRide(null);
            setDriverToOriginCoords([]);
            setOriginToDestCoords([]);
        } finally {
            setAceitandoCorrida(false);
        }
    };

    // ✅ Finalizar corrida via Backend (calcula ganho líquido server-side)
    const finalizarCorrida = () => {
        Alert.alert("Finalizar", "O passageiro chegou ao destino?", [
            { text: "Não" },
            {
                text: "Sim", onPress: async () => {
                    setFinalizandoCorrida(true);
                    try {
                        const result = await ridesApi.finalizar(corridaEmAndamento.id);
                        Alert.alert(
                            '✅ Corrida Finalizada!',
                            `Seu ganho: R$ ${result.ganhoLiquido.toFixed(2)}`
                        );
                        setCorridaEmAndamento(null);
                        setDriverToOriginCoords([]);
                        setOriginToDestCoords([]);
                        setOnline(true);
                    } catch (err: any) {
                        Alert.alert('Erro', err.message || 'Não foi possível finalizar a corrida.');
                    } finally {
                        setFinalizandoCorrida(false);
                    }
                }
            }
        ]);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('@user_type');
        router.replace('/(tabs)');
    };

    if (loading || !location) return (
        <View style={styles.containerCenter}>
            <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );

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
                {/* Marcador do motorista */}
                <Marker coordinate={location}>
                    <View style={styles.driverMarker}><Ionicons name="car" size={20} color="#fff" /></View>
                </Marker>

                {/* Marcadores das corridas disponíveis */}
                {!corridaEmAndamento && rides.map(ride => (
                    <Marker
                        key={ride.id}
                        coordinate={{ latitude: ride.origin_coords.lat, longitude: ride.origin_coords.lng }}
                        onPress={() => { setSelectedRide(ride); traçarRota(ride); }}
                    >
                        <View style={styles.rideMarker}><Text style={styles.rideMarkerText}>R$</Text></View>
                    </Marker>
                ))}

                {/* Rotas */}
                {driverToOriginCoords.length > 0 && (
                    <Polyline coordinates={driverToOriginCoords} strokeWidth={4} strokeColor="#00BFFF" lineDashPattern={[5, 5]} />
                )}
                {originToDestCoords.length > 0 && (
                    <Polyline coordinates={originToDestCoords} strokeWidth={6} strokeColor="#007AFF" />
                )}
            </MapView>

            {/* Cabeçalho superior (oculto durante corrida) */}
            {!corridaEmAndamento && (
                <View style={[styles.topContainer, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.greeting}>Olá, {nome}</Text>
                            <Text style={[styles.onlineBadge, { color: online ? '#34C759' : '#888' }]}>
                                {online ? "● Online" : "○ Offline"}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={[styles.statusBtn, online ? styles.bgOnline : styles.bgOffline]}
                        onPress={() => { setOnline(!online); if (online) setSelectedRide(null); }}
                    >
                        <Text style={styles.statusText}>{online ? "PAUSAR RECEBIMENTO" : "FICAR DISPONÍVEL"}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Interface Inferior */}
            <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + 10 }]}>

                {/* 1. LISTA DE CORRIDAS DISPONÍVEIS */}
                {online && !selectedRide && !corridaEmAndamento && (
                    <ScrollView style={styles.ridesList} showsVerticalScrollIndicator={false}>
                        <Text style={styles.listTitle}>{rides.length} CHAMADAS AGORA</Text>
                        {rides.map((ride) => (
                            <TouchableOpacity
                                key={ride.id}
                                style={styles.rideItem}
                                onPress={() => { setSelectedRide(ride); traçarRota(ride); }}
                            >
                                <View style={styles.ridePriceBadge}>
                                    {/* ✅ Ganho do motorista calculado pelo servidor — aqui mostramos o valor salvo */}
                                    <Text style={styles.rideItemValue}>
                                        R$ {(ride.valor * 0.9).toFixed(2)}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.rideItemAddr} numberOfLines={1}>{ride.origin_text}</Text>
                                    <Text style={styles.rideItemDist}>{ride.distancia}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#444" />
                            </TouchableOpacity>
                        ))}
                        {rides.length === 0 && (
                            <Text style={styles.noRides}>Aguardando novas solicitações...</Text>
                        )}
                    </ScrollView>
                )}

                {/* 2. CARD DE INSPEÇÃO (antes de aceitar) */}
                {selectedRide && !corridaEmAndamento && (
                    <View style={styles.bottomCard}>
                        <View style={styles.dragHandle} />
                        <Text style={styles.rideLabel}>GANHO LÍQUIDO ESTIMADO</Text>
                        <Text style={styles.rideValue}>R$ {(selectedRide.valor * 0.9).toFixed(2)}</Text>

                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={16} color="#00BFFF" />
                            <Text style={styles.addressText} numberOfLines={2}>
                                Embarque: {selectedRide.origin_text}
                            </Text>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={() => {
                                    setSelectedRide(null);
                                    setDriverToOriginCoords([]);
                                    setOriginToDestCoords([]);
                                }}
                            >
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.btnAccept}
                                onPress={handleAcceptRide}
                                disabled={aceitandoCorrida}
                            >
                                {aceitandoCorrida
                                    ? <ActivityIndicator color="#000" />
                                    : <Text style={styles.btnAcceptText}>ACEITAR CORRIDA</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* 3. CARD DE PRIORIDADE (corrida em andamento) */}
                {corridaEmAndamento && (
                    <View style={[styles.bottomCard, { borderTopColor: '#34C759', borderTopWidth: 3 }]}>
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>EM VIAGEM ATIVA</Text>
                        </View>
                        <Text style={styles.rideValue}>R$ {(corridaEmAndamento.valor * 0.9).toFixed(2)}</Text>

                        <View style={styles.destinationBox}>
                            <Text style={styles.destTitle}>DESTINO DO PASSAGEIRO</Text>
                            <Text style={styles.destAddr}>{corridaEmAndamento.destination_text}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.btnFinish, finalizandoCorrida && { opacity: 0.6 }]}
                            onPress={finalizarCorrida}
                            disabled={finalizandoCorrida}
                        >
                            {finalizandoCorrida
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.btnFinishText}>FINALIZAR E RECEBER</Text>
                            }
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
    topContainer: { position: 'absolute', left: 20, right: 20, zIndex: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    onlineBadge: { fontSize: 12, fontWeight: 'bold' },
    profileBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 20 },
    statusBtn: { padding: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    bgOnline: { backgroundColor: '#FF3B30' },
    bgOffline: { backgroundColor: '#34C759' },
    statusText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
    bottomWrapper: { position: 'absolute', bottom: 0, width: '100%', zIndex: 11 },
    ridesList: { maxHeight: 300, backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderTopWidth: 1, borderTopColor: '#222' },
    listTitle: { color: '#555', fontSize: 11, fontWeight: 'bold', marginBottom: 15 },
    rideItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1c', padding: 14, borderRadius: 18, marginBottom: 10 },
    ridePriceBadge: { backgroundColor: '#222', padding: 10, borderRadius: 12 },
    rideItemValue: { color: '#34C759', fontWeight: 'bold', fontSize: 15 },
    rideItemAddr: { color: '#fff', fontSize: 14, fontWeight: '500' },
    rideItemDist: { color: '#666', fontSize: 12 },
    noRides: { color: '#444', textAlign: 'center', marginTop: 20, fontSize: 13 },
    bottomCard: { backgroundColor: '#111', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, shadowColor: '#000', shadowRadius: 10, elevation: 20 },
    dragHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    rideLabel: { color: '#007AFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
    rideValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25, paddingHorizontal: 20 },
    addressText: { color: '#bbb', fontSize: 15, marginLeft: 8, textAlign: 'center' },
    actionRow: { flexDirection: 'row', gap: 15 },
    btnAccept: { flex: 4, backgroundColor: '#fff', padding: 20, borderRadius: 22, alignItems: 'center' },
    btnAcceptText: { color: '#000', fontWeight: 'bold', fontSize: 17 },
    btnCancel: { flex: 1, backgroundColor: '#222', padding: 20, borderRadius: 22, alignItems: 'center' },
    activeBadge: { backgroundColor: 'rgba(52, 199, 89, 0.1)', alignSelf: 'center', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginBottom: 10 },
    activeBadgeText: { color: '#34C759', fontSize: 11, fontWeight: 'bold' },
    destinationBox: { backgroundColor: '#1c1c1c', padding: 20, borderRadius: 20, marginBottom: 25 },
    destTitle: { color: '#555', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
    destAddr: { color: '#fff', fontSize: 16, fontWeight: '500' },
    btnFinish: { backgroundColor: '#34C759', padding: 22, borderRadius: 22, alignItems: 'center' },
    btnFinishText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    driverMarker: { backgroundColor: '#007AFF', padding: 8, borderRadius: 25, borderWidth: 3, borderColor: '#fff' },
    rideMarker: { backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
    rideMarkerText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});