import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
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
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { decodePolyline, mapsApi, ridesApi } from "../../src/lib/api";
import { supabase } from "../../src/lib/supabase";

// ✅ FIX DEFINITIVO: Garante que os componentes do mapa nunca sejam 'undefined' se estiver testando no Web ou simulador incompleto
let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  } catch (e) {
    console.warn("react-native-maps não pôde ser carregado neste ambiente.");
  }
}

const { width, height } = Dimensions.get("window");

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
  const [searchText, setSearchText] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [metodoPagamento, setMetodoPagamento] = useState<"dinheiro" | "pix">(
    "dinheiro",
  );
  const [aguardandoMotorista, setAguardandoMotorista] = useState(false);
  const [idCorridaAtual, setIdCorridaAtual] = useState<string | null>(null);
  const [confirmandoCorrida, setConfirmandoCorrida] = useState(false);

  const mapRef = useRef<any>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/(auth)/loginPassageiro");
          return;
        }
        const { data } = await supabase
          .from("passageiros")
          .select("nome")
          .eq("id", session.user.id)
          .maybeSingle();
        if (data?.nome) setNome(data.nome.split(" ")[0]);

        // Isolando o Location para não travar a tela inteira se falhar no Web
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            // ✨ Criamos uma promessa que rejeita após 5 segundos
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Timeout obtendo localização")),
                5000,
              ),
            );

            // 🏃‍♂️ Corrida: o que responder primeiro (o GPS ou o cronômetro) ganha!
            let loc = (await Promise.race([
              Location.getCurrentPositionAsync({}), // Sem a propriedade 'timeout' aqui dentro!
              timeoutPromise,
            ])) as any;

            setLocation(loc.coords);
          } else {
            // Se a permissão for negada no navegador, usa o centro de Lages
            setLocation({ latitude: -27.815, longitude: -50.326 });
          }
        } catch (locationError) {
          console.warn(
            "Não foi possível obter a localização atual, usando padrão:",
            locationError,
          );
          // Coordenada padrão caso o navegador recuse ou dê timeout
          setLocation({ latitude: -27.815, longitude: -50.326 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false); // Garante que SEMPRE vai sair do carregamento infinito
      }
    })();
  }, []);

  const handleLogout = async () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    await supabase.auth.signOut();
    await AsyncStorage.removeItem("@user_type");
    router.replace("/(tabs)");
  };

  const buscarEnderecos = (texto: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      if (texto.length > 2 && location) {
        try {
          const data = await mapsApi.geocode(
            texto,
            location.latitude,
            location.longitude,
          );
          setResults(data.results || []);
        } catch (e) {
          console.error("Erro ao buscar endereços:", e);
        }
      } else {
        setResults([]);
      }
    }, 300);
  };

  const calcularRota = async (origem: any, destino: any) => {
    try {
      setPreco("Calculando..."); // Define o feedback visual de início

      const data = await mapsApi.rota(
        origem.latitude,
        origem.longitude,
        destino.lat,
        destino.lng,
      );

      const decoded = decodePolyline(data.geometry);
      setRouteCoords(decoded);
      setDistancia(data.distanciaFormatada);

      if (data.valor) {
        setPreco(
          data.valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
        );
      } else {
        const kmNumero =
          parseFloat(data.distanciaFormatada.replace(/[^\d.]/g, "")) || 0;
        const valorEstimado = 5.0 + kmNumero * 2.5;
        setPreco(
          valorEstimado.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
        );
      }

      if (
        mapRef.current &&
        typeof mapRef.current.fitToCoordinates === "function"
      ) {
        mapRef.current.fitToCoordinates(decoded, {
          edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
          animated: true,
        });
      }
    } catch (e) {
      console.error("Erro ao calcular rota:", e);

      // ✅ FIX: Se a API der erro 500 (rota impossível), destrava a interface do usuário
      setPreco(null);
      setDistancia(null);
      setRouteCoords([]);
      setDestination(null);

      Alert.alert(
        "Rota Inválida",
        "Não foi possível calcular uma rota de carro até o destino selecionado.",
      );
    }
  };
  const handleConfirm = async () => {
    if (!location || !destination) return;

    setConfirmandoCorrida(true);
    try {
      const response = await ridesApi.solicitar({
        origin_coords: { lat: location.latitude, lng: location.longitude },
        destination_coords: { lat: destination.lat, lng: destination.lng },
        metodo_pagamento: metodoPagamento,
        destination_text: searchText || undefined,
      });

      setPreco(
        response.ride.valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      );
      setDistancia(response.ride.distancia);
      setIdCorridaAtual(response.ride.id);
      setAguardandoMotorista(true);
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err.message || "Verifique sua conexão e tente novamente.",
      );
    } finally {
      setConfirmandoCorrida(false);
    }
  };

  const handleCancelar = async () => {
    if (!idCorridaAtual) return;
    try {
      await ridesApi.cancelar(idCorridaAtual);
      setAguardandoMotorista(false);
      setIdCorridaAtual(null);
      setDestination(null);
      setRouteCoords([]);
      setSearchText("");
      setPreco(null);
      setDistancia(null);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Erro ao cancelar.");
    }
  };

  if (loading || !location) {
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
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
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.lat,
              longitude: destination.lng,
            }}
            pinColor="#FF3B30"
          />
        )}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#007AFF"
          />
        )}
      </MapView>

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
            <Ionicons
              name="search"
              size={20}
              color="#666"
              style={{ marginLeft: 15 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar destino..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={(t) => {
                setSearchText(t);
                buscarEnderecos(t);
              }}
              onFocus={() => setBuscando(true)}
            />
          </View>

          {buscando && results.length > 0 && (
            <View style={styles.resultsList}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {results.map((item: any, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.resultItem}
                    onPress={() => {
                      const dest = { lat: item.lat, lng: item.lng };
                      setDestination(dest);
                      setBuscando(false);
                      setSearchText(item.nome);
                      setResults([]);
                      calcularRota(location, dest);
                    }}
                  >
                    <Text style={styles.resultText} numberOfLines={1}>
                      {item.nome} {item.cidade ? `- ${item.cidade}` : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>
        {aguardandoMotorista ? (
          <View style={styles.waitingBox}>
            <ActivityIndicator size="large" color="#34C759" />
            <Text style={styles.waitingText}>Procurando motoristas...</Text>
            <Text style={styles.waitingSubtext}>
              Valor confirmado: {preco} • {distancia}
            </Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelar}>
              <Text style={styles.cancelBtnText}>CANCELAR CORRIDA</Text>
            </TouchableOpacity>
          </View>
        ) : destination ? (
          <>
            <View style={styles.estimateBox}>
              <View style={styles.carIconBox}>
                <Ionicons name="car-sport" size={24} color="#fff" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.carType}>Drive E Econômico</Text>
                <Text style={styles.carTime}>
                  {distancia} • {metodoPagamento.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.price}>{preco || "..."}</Text>
            </View>

            <View style={styles.paymentRow}>
              <TouchableOpacity
                style={[
                  styles.payBtn,
                  metodoPagamento === "dinheiro" && styles.payBtnActive,
                ]}
                onPress={() => setMetodoPagamento("dinheiro")}
              >
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={metodoPagamento === "dinheiro" ? "#000" : "#fff"}
                />
                <Text
                  style={[
                    styles.payTxt,
                    metodoPagamento === "dinheiro" && styles.payTxtActive,
                  ]}
                >
                  Dinheiro
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.payBtn,
                  metodoPagamento === "pix" && styles.payBtnActive,
                ]}
                onPress={() => setMetodoPagamento("pix")}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color={metodoPagamento === "pix" ? "#000" : "#fff"}
                />
                <Text
                  style={[
                    styles.payTxt,
                    metodoPagamento === "pix" && styles.payTxtActive,
                  ]}
                >
                  PIX
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={confirmandoCorrida}
            >
              {confirmandoCorrida ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.confirmBtnText}>SOLICITAR DRIVE E</Text>
              )}
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

const mapDarkStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  map: { width: width, height: height },
  containerCenter: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  topContainer: { position: "absolute", left: 20, right: 20, zIndex: 5 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  greeting: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  subtitle: { color: "#888", fontSize: 14 },
  logoutBtn: { backgroundColor: "#222", padding: 10, borderRadius: 20 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    height: 55,
    elevation: 5,
  },
  searchInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, color: "#000" },
  resultsList: {
    backgroundColor: "#fff",
    marginTop: 5,
    borderRadius: 15,
    maxHeight: 200,
    padding: 10,
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  resultText: { color: "#333", fontWeight: "500" },
  bottomCard: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#111",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
  },
  estimateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
  },
  carIconBox: { backgroundColor: "#007AFF", padding: 10, borderRadius: 15 },
  carType: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  carTime: { color: "#888", fontSize: 12 },
  price: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  paymentRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  payBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
  },
  payBtnActive: { backgroundColor: "#fff", borderColor: "#fff" },
  payTxt: { color: "#fff", marginLeft: 8, fontWeight: "bold" },
  payTxtActive: { color: "#000" },
  confirmBtn: {
    backgroundColor: "#34C759",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  confirmBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  waitingBox: { alignItems: "center", paddingVertical: 15 },
  waitingText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 15,
  },
  waitingSubtext: { color: "#555", fontSize: 13, marginTop: 8 },
  cancelBtn: { marginTop: 20 },
  cancelBtnText: { color: "#FF3B30", fontWeight: "bold" },
  emptyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { color: "#666", fontSize: 15 },
  userMarker: {
    width: 22,
    height: 22,
    backgroundColor: "rgba(0, 122, 255, 0.2)",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    backgroundColor: "#007AFF",
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
});
