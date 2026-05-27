import { supabase } from "@/src/lib/supabase";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

export function useMotoristaSession() {
  const router = useRouter();
  const [nome, setNome] = useState<string>("Motorista");
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/(auth)/loginMotorista");
          return;
        }

        const { data } = await supabase
          .from("motoristas")
          .select("nome")
          .eq("email", session.user.email)
          .maybeSingle();

        if (data?.nome) setNome(data.nome.split(" ")[0]);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc.coords);
        } else {
          setLocation({ latitude: -23.55052, longitude: -46.633308 });
        }
      } catch {
        setLocation({ latitude: -23.55052, longitude: -46.633308 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { nome, location, loading };
}
