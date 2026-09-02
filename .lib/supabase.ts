import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

import { authStorage } from "@/.lib/authStorage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// `authStorage` decide entre storage persistente e efêmero conforme a opção
// "Manter-me conectado" (ver .lib/authStorage.ts). Ele já trata o SSR do
// expo-router (sem window) caindo para memória.
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
