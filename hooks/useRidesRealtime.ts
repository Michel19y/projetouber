import { supabase } from "@/src/lib/supabase";
import { useEffect, useState } from "react";

export function useRidesRealtime(online: boolean, corridaEmAndamento: any) {
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    // 1. Controla se o componente continua montado na tela
    let isMounted = true;

    // Se o motorista estiver offline ou em uma viagem ativa, limpa o estado e não conecta
    if (!online || corridaEmAndamento) {
      setRides([]);
      return;
    }

    // 2. Função assíncrona para buscar as corridas iniciais no seu backend Node
    // Dentro de useRidesRealtime.ts
    const fetchPending = async () => {
      try {
        // 1. Busca o token armazenado no celular após o login
        // Certifique-se de usar a MESMA chave que você usou na tela de Login (ex: 'token', 'user_token' ou 'supabase.auth.token')
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        console.log("🔑 [Frontend] Token recuperado do AsyncStorage:", token);

        if (!token) {
          console.warn(
            "⚠️ [Frontend] Nenhum token foi encontrado! O motorista está deslogado?",
          );
          return;
        }

        // 2. Faz a chamada passando o token no formato Bearer correto
        const response = await fetch(
          "http://localhost:3001/api/rides/disponiveis",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // 🔴 Garanta que a crase e o Bearer estão assim
            },
          },
        );

        // Se o backend responder erro (como o 401)
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error(
            "❌ [Frontend] Erro retornado pela API:",
            response.status,
            errData,
          );
          return;
        }

        // 3. Se deu certo, atualiza o estado das corridas na tela
        const dados = await response.json();
        console.log(
          "✅ [Frontend] Corridas pendentes carregadas:",
          dados.length,
        );
        setRides(dados);
      } catch (error) {
        console.error(
          "🚨 [Frontend] Falha de conexão ao buscar chamadas:",
          error,
        );
      }
    };

    fetchPending();

    // 3. Configuração do canal do Supabase Realtime via WebSockets
    const channel = supabase
      .channel("rides-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides" },
        (p) => {
          // 👈 CORRIGIDO: Verificando o status correto 'aguardando'
          if (isMounted && p.new.status === "aguardando" && !p.new.driver_id) {
            setRides((prev) => {
              if (prev.some((r) => r.id === p.new.id)) return prev;
              return [...prev, p.new];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides" },
        (p) => {
          if (isMounted) {
            // 👈 CORRIGIDO: Verificando o status correto 'aguardando'
            if (p.new.status !== "aguardando" || p.new.driver_id !== null) {
              setRides((prev) => prev.filter((r) => r.id !== p.new.id));
            } else {
              setRides((prev) =>
                prev.map((r) => (r.id === p.new.id ? p.new : r)),
              );
            }
          }
        },
      )
      .subscribe();

    // 4. Função de Limpeza (Cleanup) disparada automaticamente pelo React
    return () => {
      isMounted = false; // Bloqueia imediatamente qualquer setRides assíncrono atrasado
      if (channel) {
        supabase
          .removeChannel(channel)
          .catch((err) =>
            console.warn("Aviso ao remover canal do Supabase Realtime:", err),
          );
      }
    };
  }, [online, corridaEmAndamento]);

  return { rides };
}
