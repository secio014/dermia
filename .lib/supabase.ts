import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// No web, o shim web do AsyncStorage acessa `window` sem checar, o que quebra
// a pré-renderização SSR do expo-router (window ainda não existe no Node).
// Deixando `storage` indefinido na web, o supabase-js usa seu próprio adapter
// (localStorage no navegador, memória no SSR), que já trata isso com segurança.
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});