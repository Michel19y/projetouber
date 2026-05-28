import MapView from "@/components/MapViewMock";
import { decodePolyline, mapsApi, ridesApi } from "@/src/lib/api";
import { supabase } from "@/src/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

const CORRIDA_ATIVA_KEY = "@corrida_ativa";

export function useCorrida(location: any) {
  const mapRef = useRef<MapView>(null);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [corridaEmAndamento, setCorridaEmAndamento] = useState<any>(null);
  const [aceitandoCorrida, setAceitandoCorrida] = useState(false);
  const [finalizandoCorrida, setFinalizandoCorrida] = useState(false);
  const [driverToOriginCoords, setDriverToOriginCoords] = useState<any[]>([]);
  const [originToDestCoords, setOriginToDestCoords] = useState<any[]>([]);

  // Restaura corrida ativa ao montar (F5, fechou e abriu o app)
  useEffect(() => {
    async function restaurarCorrida() {
      try {
        const salva = await AsyncStorage.getItem(CORRIDA_ATIVA_KEY);
        if (!salva) return;

        const corrida = JSON.parse(salva);

        // Confirma no banco se ainda está ativa
        const { data } = await supabase
          .from("rides")
          .select("status")
          .eq("id", corrida.id)
          .single();

        if (data?.status === "aceita") {
          setCorridaEmAndamento(corrida);
        } else {
          // Corrida já finalizou ou cancelou — limpa o storage
          await AsyncStorage.removeItem(CORRIDA_ATIVA_KEY);
        }
      } catch {
        // Silencia erros de parse ou rede
      }
    }
    restaurarCorrida();
  }, []);

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
      // Persiste localmente para sobreviver a F5 / reinício do app
      await AsyncStorage.setItem(
        CORRIDA_ATIVA_KEY,
        JSON.stringify(selectedRide),
      );
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
    const confirmado =
      typeof window !== "undefined"
        ? window.confirm("O passageiro chegou ao destino?")
        : true;

    if (!confirmado) return;

    const executar = async () => {
      setFinalizandoCorrida(true);
      try {
        const result = await ridesApi.finalizar(corridaEmAndamento.id);
        // Limpa persistência ao finalizar
        await AsyncStorage.removeItem(CORRIDA_ATIVA_KEY);
        const msg = `Seu ganho: R$ ${result.ganhoLiquido?.toFixed(2) ?? "---"}`;
        if (typeof window !== "undefined") {
          window.alert(`✅ Corrida Finalizada!\n${msg}`);
        } else {
          Alert.alert("✅ Corrida Finalizada!", msg);
        }
        setCorridaEmAndamento(null);
        setDriverToOriginCoords([]);
        setOriginToDestCoords([]);
        onSuccess();
      } catch (err: any) {
        const msg = err.message || "Não foi possível finalizar.";
        if (typeof window !== "undefined") {
          window.alert(`Erro: ${msg}`);
        } else {
          Alert.alert("Erro", msg);
        }
      } finally {
        setFinalizandoCorrida(false);
      }
    };

    executar();
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
