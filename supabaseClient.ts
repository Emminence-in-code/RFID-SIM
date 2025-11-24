import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from './types';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

// Fallback credentials in case .env is not loaded by the environment
const FALLBACK_URL = "https://ynemvstppbexmuhifddd.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZW12c3RwcGJleG11aGlmZGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTIyNDAsImV4cCI6MjA3OTQ2ODI0MH0.WvsSSJkXzwZnjVgvNwMCxh9fFxdzHWY4SVddrdfACmI";

// Get config from Vite env or Fallback
const getEnvConfig = (): SupabaseConfig => {
  // Use optional chaining to prevent crash if import.meta.env is undefined
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || FALLBACK_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;
  
  return { url, key };
};

// Returns the singleton client
export const getSupabase = (): SupabaseClient | null => {
  return supabaseInstance;
};

// Initializes if not already
export const initSupabase = (config?: SupabaseConfig): SupabaseClient => {
  if (!supabaseInstance) {
    const conf = config || getEnvConfig();
    
    if (conf.url && conf.key) {
      try {
        supabaseInstance = createClient(conf.url, conf.key);
        console.log("Supabase client initialized successfully.");
      } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
      }
    } else {
      console.warn("Supabase credentials missing. Client not initialized.");
    }
  }
  return supabaseInstance!;
};

// Check config; DON'T re-init here
export const hasSupabaseConfig = (): boolean => {
  const config = getEnvConfig();
  return !!(config.url && config.key);
};

export const saveSupabaseConfig = (config: SupabaseConfig) => {
  supabaseInstance = createClient(config.url, config.key);
};

export const clearSupabaseConfig = () => {
  supabaseInstance = null;
};