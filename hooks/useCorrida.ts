import MapView from "@/components/MapViewMock";
import { decodePolyline, mapsApi, ridesApi } from "@/src/lib/api";
import { useRef, useState } from "react";
import { Alert } from "react-native";

export function useCorrida(location: any) {
  const mapRef = useRef<MapView>(null);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [corridaEmAndamento, setCorridaEmAndamento] = useState<any>(null);
  const [aceitandoCorrida, setAceitandoCorrida] = useState(false);
  const [finalizandoCorrida, setFinalizandoCorrida] = useState(false);
  const [driverToOriginCoords, setDriverToOriginCoords] = useState<any[]>([]);
  const [originToDestCoords, setOriginToDestCoords] = useState<any[]>([]);

  const traçarRota = async (ride: any) => {
    if (!location) return;
    try {
      const data = await mapsApi.rotaMotorista(
        location.latitude,
        location.longitude,
        ride.origin_coords.lat,
        ride.origin_coords.lng,
        ride.destination_coords.lat,
        ride.destination_coords.lng,
      );
      const p1 = decodePolyline(data.rotaAtendimento.geometry);
      const p2 = decodePolyline(data.rotaViagem.geometry);
      setDriverToOriginCoords(p1);
      setOriginToDestCoords(p2);
      mapRef.current?.fitToCoordinates([...p1, ...p2], {
        edgePadding: { top: 80, right: 50, bottom: 450, left: 50 },
        animated: true,
      });
    } catch {
      Alert.alert("Erro", "Não foi possível traçar a rota.");
    }
  };

  const handleAcceptRide = async () => {
    if (!selectedRide) return;
    setAceitandoCorrida(true);
    try {
      await ridesApi.aceitar(selectedRide.id);
      setCorridaEmAndamento(selectedRide);
      setSelectedRide(null);
    } catch (err: any) {
      Alert.alert(
        "Indisponível",
        err.message || "Corrida já aceita ou cancelada.",
      );
      setSelectedRide(null);
      setDriverToOriginCoords([]);
      setOriginToDestCoords([]);
    } finally {
      setAceitandoCorrida(false);
    }
  };

  const finalizarCorrida = (onSuccess: () => void) => {
    Alert.alert("Finalizar", "O passageiro chegou ao destino?", [
      { text: "Não" },
      {
        text: "Sim",
        onPress: async () => {
          setFinalizandoCorrida(true);
          try {
            const result = await ridesApi.finalizar(corridaEmAndamento.id);
            Alert.alert(
              "✅ Corrida Finalizada!",
              `Seu ganho: R$ ${result.ganhoLiquido.toFixed(2)}`,
            );
            setCorridaEmAndamento(null);
            setDriverToOriginCoords([]);
            setOriginToDestCoords([]);
            onSuccess();
          } catch (err: any) {
            Alert.alert("Erro", err.message || "Não foi possível finalizar.");
          } finally {
            setFinalizandoCorrida(false);
          }
        },
      },
    ]);
  };

  const cancelarSelecao = () => {
    setSelectedRide(null);
    setDriverToOriginCoords([]);
    setOriginToDestCoords([]);
  };

  return {
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
  };
}
