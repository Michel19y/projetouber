import { supabase } from './supabase';

// ============================================================
// URL do Backend
// ============================================================
// Durante desenvolvimento:
//   - Se estiver num emulador Android: use http://10.0.2.2:3001
//   - Se estiver em um dispositivo físico: use o IP da sua máquina na rede local
//     ex: http://192.168.1.100:3001  (descubra com `ipconfig` no Windows)
//   - Se estiver num emulador iOS: use http://localhost:3001
//
// Em produção: substitua pela URL do seu servidor hospedado.
// ============================================================
const BACKEND_URL = 'http://192.168.0.3:3001'; // IP da máquina na rede local

// ============================================================
// Cliente HTTP principal
// ============================================================
// Toda requisição ao backend injeta automaticamente o token JWT
// do usuário logado no header Authorization.
// ============================================================
async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: object,
  queryParams?: Record<string, string>, // O 4º argumento (opcional)
  isPublic: boolean = false             // 👈 Certifique-se de que o 5º argumento está exatamente assim!
): Promise<any> {
  // 1. Pega o token da sessão atual do Supabase
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  // 2. Monta a URL com query params se houver
  let url = `${BACKEND_URL}${path}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  // 3. Faz a requisição com o token no header
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    // Lança erro com a mensagem que veio do backend
    const error = new Error(data.error || 'Erro desconhecido no servidor.');
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
  /**
   * Solicita uma nova corrida. O preço é calculado no servidor.
   */
  solicitar: (params: {
    origin_coords: { lat: number; lng: number };
    destination_coords: { lat: number; lng: number };
    metodo_pagamento: 'dinheiro' | 'pix';
    destination_text?: string;
  }) => apiRequest('POST', '/api/rides/solicitar', params),

  /**
   * Cancela uma corrida pendente.
   */
  cancelar: (ride_id: string) =>
    apiRequest('POST', '/api/rides/cancelar', { ride_id }),

  /**
   * Motorista aceita uma corrida.
   */
  aceitar: (ride_id: string) =>
    apiRequest('POST', '/api/rides/aceitar', { ride_id }),

  /**
   * Motorista finaliza a corrida.
   */
  finalizar: (ride_id: string) =>
    apiRequest('POST', '/api/rides/finalizar', { ride_id }),
};

// ============================================================
// API de Mapas
// ============================================================
export const mapsApi = {
  /**
   * Busca endereços por texto (autocomplete).
   */
  geocode: (q: string, lat?: number, lng?: number) =>
    apiRequest('GET', '/api/maps/geocode', undefined, {
      q,
      ...(lat !== undefined && { lat: String(lat) }),
      ...(lng !== undefined && { lng: String(lng) }),
    }),

  /**
   * Converte coordenadas em nome de endereço.
   */
  reverseGeocode: (lat: number, lng: number) =>
    apiRequest('GET', '/api/maps/reverse', undefined, {
      lat: String(lat),
      lng: String(lng),
    }),

  /**
   * Calcula rota entre dois pontos.
   */
  rota: (originLat: number, originLng: number, destLat: number, destLng: number) =>
    apiRequest('GET', '/api/maps/rota', undefined, {
      originLat: String(originLat),
      originLng: String(originLng),
      destLat: String(destLat),
      destLng: String(destLng),
    }),

  /**
   * Calcula duas rotas para o motorista: até a origem e da origem ao destino.
   */
  rotaMotorista: (
    driverLat: number, driverLng: number,
    originLat: number, originLng: number,
    destLat: number, destLng: number
  ) =>
    apiRequest('GET', '/api/maps/rota-motorista', undefined, {
      driverLat: String(driverLat),
      driverLng: String(driverLng),
      originLat: String(originLat),
      originLng: String(originLng),
      destLat: String(destLat),
      destLng: String(destLng),
    }),
};

// ============================================================
// Decoder de Polyline (compartilhado por ambas as telas)
// ============================================================
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });

    
  }

  return points;

  
}

// ============================================================
// API de Autenticação / Cadastro
// ============================================================


export const authApi = {
  registerMotorista: (params: any) => 
    apiRequest('POST', '/api/auth/register-motorista', params, undefined, true),

  // 🟢 ADICIONE ESTA LINHA AQUI:
  loginMotorista: (params: any) => 
    apiRequest('POST', '/api/auth/login-motorista', params, undefined, true),
};

// No final do arquivo, agrupa e exporta tudo junto:
export const api = {
  rides: ridesApi,
  auth: authApi,
  maps: mapsApi,
  decodePolyline
};

