import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from './types';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

// Get config from Vite env
const getEnvConfig = (): SupabaseConfig => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  console.log('Loaded Supabase Config from .env:', { url, key });
  return { url, key };
};

// Returns the singleton client
export const getSupabase = (): SupabaseClient | null => {
  return supabaseInstance;
};

// Initializes if not already
export const initSupabase = (config?: SupabaseConfig): SupabaseClient => {
  if (!supabaseInstance) {
    if (!config) config = getEnvConfig();
    supabaseInstance = createClient(config.url, config.key);
    console.log("Supabase client initialized.");
  } else {
    console.log("Supabase client already initialized.");
  }
  return supabaseInstance;
};

// Check config; DON'T re-init here
export const hasSupabaseConfig = (): boolean => {
  const config = getEnvConfig();
  const valid = !!(config.url && config.key);
  // Don't call initSupabase here for a pure check
  return valid;
};

// For frontend .env, do NOT use save/clear (only for dev/testing)
export const saveSupabaseConfig = (config: SupabaseConfig) => {
  supabaseInstance = createClient(config.url, config.key);
};

export const clearSupabaseConfig = () => {
  supabaseInstance = null;
};
