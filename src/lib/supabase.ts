import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://fvsdcczmwaizxjgtddwe.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2c2RjY3ptd2FpenhqZ3RkZHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDE5MzQsImV4cCI6MjA5NTExNzkzNH0.oEfDzI604NXwRriWI-s5pZaGAg36HHEaxUbeyjCTx9A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: false, // Desabilitado para evitar loop infinito quando offline/projeto pausado
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (...args) => {
      // Timeout de 10 segundos — evita que o app trave indefinidamente
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      return fetch(args[0] as RequestInfo, {
        ...(args[1] as RequestInit),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});