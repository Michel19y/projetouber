import { supabase } from "./supabase";

// ============================================================
// URL do Backend
// ============================================================
const BACKEND_URL = "http://localhost:3001"; // IP da máquina na rede local

// ============================================================
// Cliente HTTP principal (Ajustado com Bypass de Session para Rotas Públicas)
// ============================================================
async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: object,
  queryParams?: Record<string, string>,
  isPublic: boolean = false, // 👈 Controla se a rota exige login prévio ou não
): Promise<any> {
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // 1. Se NÃO for uma rota pública, exige token de autenticação
  if (!isPublic) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Usuário não autenticado.");
    }

    // Injeta o Token JWT do Supabase para o back-end validar
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  // 2. Monta a URL com query params se houver
  let url = `${BACKEND_URL}${path}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  // 3. Faz a requisição
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "Erro desconhecido no servidor.");
    (error as any).code = data.code;
    (error as any).status = response.status;
    throw error;
  }

  return data;
}

// ============================================================
// API de Corridas
// ============================================================
export const ridesApi = {
  solicitar: (params: {
    origin_coords: { lat: number; lng: number };
    destination_coords: { lat: number; lng: number };
    metodo_pagamento: "dinheiro" | "pix";
    destination_text?: string;
  }) => apiRequest("POST", "/api/rides/solicitar", params),

  cancelar: (ride_id: string) =>
    apiRequest("POST", "/api/rides/cancelar", { ride_id }),
  aceitar: (ride_id: string) =>
    apiRequest("POST", "/api/rides/aceitar", { ride_id }),
  finalizar: (ride_id: string) =>
    apiRequest("POST", "/api/rides/finalizar", { ride_id }),
};

// ============================================================
// API de Mapas
// ============================================================
export const mapsApi = {
  geocode: (q: string, lat?: number, lng?: number) =>
    apiRequest("GET", "/api/maps/geocode", undefined, {
      q,
      ...(lat !== undefined && { lat: String(lat) }),
      ...(lng !== undefined && { lng: String(lng) }),
    }),

  reverseGeocode: (lat: number, lng: number) =>
    apiRequest("GET", "/api/maps/reverse", undefined, {
      lat: String(lat),
      lng: String(lng),
    }),

  rota: (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ) =>
    apiRequest("GET", "/api/maps/rota", undefined, {
      originLat: String(originLat),
      originLng: String(originLng),
      destLat: String(destLat),
      destLng: String(destLng),
    }),

  rotaMotorista: (
    driverLat: number,
    driverLng: number,
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ) =>
    apiRequest("GET", "/api/maps/rota-motorista", undefined, {
      driverLat: String(driverLat),
      driverLng: String(driverLng),
      originLat: String(originLat),
      originLng: String(originLng),
      destLat: String(destLat),
      destLng: String(destLng),
    }),
};

// ============================================================
// Decoder de Polyline
// ============================================================
export function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  let points = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// ============================================================
// 🌟 API de Autenticação / Cadastro (AGORA COMPLETA E COMPATÍVEL)
// ============================================================
export const authApi = {
  // Motorista
  registerMotorista: (params: any) =>
    apiRequest("POST", "/api/auth/register-motorista", params, undefined, true),

  loginMotorista: (params: any) =>
    apiRequest("POST", "/api/auth/login-motorista", params, undefined, true),

  // Passageiro (Adicionados para matar o erro do VS Code!)
  registerPassageiro: (params: any) =>
    apiRequest(
      "POST",
      "/api/auth/register-passageiro",
      params,
      undefined,
      true,
    ),

  loginPassageiro: (params: any) =>
    apiRequest("POST", "/api/auth/login-passageiro", params, undefined, true),
};

// Exportação unificada do ecossistema
export const api = {
  rides: ridesApi,
  auth: authApi,
  maps: mapsApi,
  decodePolyline,
};
