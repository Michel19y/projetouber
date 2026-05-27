import MapView, { Marker, Polyline } from "@/components/MapViewMock";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCorrida } from "../../hooks/useCorrida";
import { useMotoristaSession } from "../../hooks/useMotoristaSession";
import { useRidesRealtime } from "../../hooks/useRidesRealtime";
import { supabase } from "../../src/lib/supabase";

export default function TelaHomeMotorista() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions(); // ← reativo, atualiza ao redimensionar

  const [online, setOnline] = useState(false);

  const { nome, location, loading } = useMotoristaSession();

  const {
    mapRef,
    selectedRide,
    setSelectedRide,
    corridaEmAndamento,
    aceitandoCorrida,
    finalizandoCorrida,
    driverToOriginCoords,
    originToDestCoords,
    traçarRota,
    handleAcceptRide,
    finalizarCorrida,
    cancelarSelecao,
  } = useCorrida(location);

  const { rides } = useRidesRealtime(online, corridaEmAndamento);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem("@user_type");
    router.replace("/(tabs)");
  };

  if (loading || !location)
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Mapa ocupa tela toda — dimensões reativas */}
      <MapView
        ref={mapRef}
        style={{ width, height }}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        customMapStyle={mapDarkStyle}
      >
        <Marker coordinate={location}>
          <View style={styles.driverMarker}>
            <Ionicons name="car" size={20} color="#fff" />
          </View>
        </Marker>

        {!corridaEmAndamento &&
          rides.map((ride) => (
            <Marker
              key={ride.id}
              coordinate={{
                latitude: ride.origin_coords.lat,
                longitude: ride.origin_coords.lng,
              }}
              onPress={() => {
                setSelectedRide(ride);
                traçarRota(ride);
              }}
            >
              <View style={styles.rideMarker}>
                <Text style={styles.rideMarkerText}>R$</Text>
              </View>
            </Marker>
          ))}

        {driverToOriginCoords.length > 0 && (
          <Polyline
            coordinates={driverToOriginCoords}
            strokeWidth={4}
            strokeColor="#00BFFF"
            lineDashPattern={[5, 5]}
          />
        )}
        {originToDestCoords.length > 0 && (
          <Polyline
            coordinates={originToDestCoords}
            strokeWidth={6}
            strokeColor="#007AFF"
          />
        )}
      </MapView>

      {/* Header — só quando não há corrida ativa */}
      {!corridaEmAndamento && (
        <View style={[styles.topContainer, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Olá, {nome}</Text>
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: online ? "#34C759" : "#555" },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: online ? "#34C759" : "#888" },
                  ]}
                >
                  {online ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              online ? styles.toggleBtnPause : styles.toggleBtnAvailable,
            ]}
            onPress={() => {
              setOnline(!online);
              if (online) cancelarSelecao();
            }}
          >
            <Text style={styles.toggleBtnText}>
              {online ? "Pausar recebimento" : "Ficar disponível"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Painel inferior */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        {/* Estado offline */}
        {!online && !corridaEmAndamento && (
          <View style={styles.offlineHint}>
            <Text style={styles.offlineTitle}>Você está offline</Text>
            <Text style={styles.offlineSubtitle}>
              Toque em "Ficar disponível" para receber chamadas.
            </Text>
          </View>
        )}

        {/* Lista de corridas */}
        {online && !selectedRide && !corridaEmAndamento && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.ridesList}
          >
            <Text style={styles.sectionLabel}>
              {rides.length} {rides.length === 1 ? "chamada" : "chamadas"} agora
            </Text>

            {rides.length === 0 && (
              <Text style={styles.noRides}>
                Aguardando novas solicitações...
              </Text>
            )}

            {rides.map((ride) => (
              <TouchableOpacity
                key={ride.id}
                style={styles.rideCard}
                onPress={() => {
                  setSelectedRide(ride);
                  traçarRota(ride);
                }}
              >
                <View style={styles.rideCardTop}>
                  <Text style={styles.rideValue}>
                    R${" "}
                    {ride.ganho_motorista?.toFixed(2) ??
                      (ride.valor * 0.9).toFixed(2)}
                  </Text>
                  <View style={styles.rideInfo}>
                    <Text style={styles.rideAddr} numberOfLines={1}>
                      {ride.origin_text}
                    </Text>
                    <Text style={styles.rideDist}>
                      {ride.distancia_km} km de distância
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#444" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Card de inspeção */}
        {selectedRide && !corridaEmAndamento && (
          <View style={styles.inspectCard}>
            <View style={styles.dragHandle} />
            <Text style={styles.inspectLabel}>Ganho estimado</Text>
            <Text style={styles.inspectValue}>
              R${" "}
              {selectedRide.ganho_motorista?.toFixed(2) ??
                (selectedRide.valor * 0.9).toFixed(2)}
            </Text>

            <View style={styles.addrRow}>
              <Ionicons name="location" size={18} color="#00BFFF" />
              <Text style={styles.addrText} numberOfLines={2}>
                Embarque: {selectedRide.origin_text}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.btnReject}
                onPress={cancelarSelecao}
              >
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnAccept}
                onPress={handleAcceptRide}
                disabled={aceitandoCorrida}
              >
                {aceitandoCorrida ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.btnAcceptText}>Aceitar corrida</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Card de corrida ativa */}
        {corridaEmAndamento && (
          <View style={styles.activeCard}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>EM VIAGEM ATIVA</Text>
            </View>

            <Text style={styles.activeValue}>
              R${" "}
              {corridaEmAndamento.ganho_motorista?.toFixed(2) ??
                (corridaEmAndamento.valor * 0.9).toFixed(2)}
            </Text>

            <View style={styles.destBox}>
              <Text style={styles.destLabel}>Destino do passageiro</Text>
              <Text style={styles.destAddr}>
                {corridaEmAndamento.destination_text}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btnFinish, finalizandoCorrida && { opacity: 0.6 }]}
              onPress={() => finalizarCorrida(() => setOnline(true))}
              disabled={finalizandoCorrida}
            >
              {finalizandoCorrida ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnFinishText}>Entreguei o passageiro</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const mapDarkStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  containerCenter: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  topContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 20,
  },
  toggleBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  toggleBtnAvailable: { backgroundColor: "#34C759" },
  toggleBtnPause: { backgroundColor: "#FF3B30" },
  toggleBtnText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
  },

  // Painel inferior
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 11,
  },

  // Offline
  offlineHint: {
    margin: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  offlineTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  offlineSubtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },

  // Lista
  ridesList: {
    maxHeight: 280,
    backgroundColor: "#111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  sectionLabel: {
    color: "#555",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noRides: {
    color: "#333",
    textAlign: "center",
    marginVertical: 20,
    fontSize: 14,
  },
  rideCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  rideCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rideValue: {
    fontSize: 22,
    fontWeight: "500",
    color: "#34C759",
    minWidth: 85,
  },
  rideInfo: { flex: 1 },
  rideAddr: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 3,
  },
  rideDist: {
    color: "#666",
    fontSize: 13,
  },

  // Card inspeção
  inspectCard: {
    backgroundColor: "#111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  inspectLabel: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  inspectValue: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
  },
  addrRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  addrText: {
    color: "#bbb",
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  btnAccept: {
    flex: 4,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  btnAcceptText: {
    color: "#000",
    fontWeight: "500",
    fontSize: 17,
  },
  btnReject: {
    flex: 1,
    backgroundColor: "#222",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },

  // Card ativo
  activeCard: {
    backgroundColor: "#0d1f0d",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderTopWidth: 2,
    borderTopColor: "#34C759",
  },
  activeBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(52,199,89,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 8,
  },
  activeBadgeText: {
    color: "#34C759",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  activeValue: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "500",
    textAlign: "center",
    marginVertical: 8,
  },
  destBox: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  destLabel: {
    color: "#555",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  destAddr: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 24,
  },
  btnFinish: {
    backgroundColor: "#34C759",
    padding: 22,
    borderRadius: 20,
    alignItems: "center",
    minHeight: 64,
    justifyContent: "center",
  },
  btnFinishText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 18,
  },

  // Marcadores
  driverMarker: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#fff",
  },
  rideMarker: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  rideMarkerText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 12,
  },
});
