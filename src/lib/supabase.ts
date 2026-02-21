


import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://efmcvdgzccwxlrssvove.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbWN2ZGd6Y2N3eGxyc3N2b3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDMzNjksImV4cCI6MjA4NzIxOTM2OX0.Mzzkx9dQuyHOJY0a8_ts4_IJrfkEvW_uPQbtr66qFes';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Só usa AsyncStorage se não estiver no ambiente de servidor (SSR)
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});