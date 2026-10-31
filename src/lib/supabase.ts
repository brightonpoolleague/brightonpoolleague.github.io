import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'bpl_supabase_url';
const STORAGE_ANON_KEY = 'bpl_supabase_anon_key';
const STORAGE_FORCE_KEY = 'bpl_force_supabase';

const DEFAULT_SUPABASE_URL = 'https://sttjprycpauamxkiwqit.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_XZofgwk2aqlKFq8WKOmELg_UwfD6YcS';

export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
} {
  const forceSupabase =
    import.meta.env.VITE_FORCE_SUPABASE === 'true' ||
    (typeof window !== 'undefined' &&
      localStorage.getItem(STORAGE_FORCE_KEY) === 'true');

  // When running locally (localhost / 127.0.0.1 / local network IP), stay in local sandbox mode
  // so local testing never modifies the live production database, unless explicitly forced
  // (e.g. inside containerized E2E tests against an isolated Supabase instance).
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.'));

  if ((import.meta.env.DEV || isLocalHost) && !forceSupabase) {
    return {
      url: '',
      anonKey: '',
      isConfigured: false,
    };
  }

  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const localUrl =
    typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_URL_KEY) || ''
      : '';
  const localKey =
    typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_ANON_KEY) || ''
      : '';

  const fallbackUrl = isLocalHost ? '' : DEFAULT_SUPABASE_URL;
  const fallbackKey = isLocalHost ? '' : DEFAULT_SUPABASE_ANON_KEY;

  const url = (localUrl || envUrl || fallbackUrl).trim();
  const anonKey = (localKey || envKey || fallbackKey).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  const key = `${url}::${anonKey}`;
  if (!cachedClient || cachedConfigKey !== key) {
    cachedClient = createClient(url, anonKey);
    cachedConfigKey = key;
  }
  return cachedClient;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  if (url.trim() && anonKey.trim()) {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  } else {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
  }
  cachedClient = null;
  cachedConfigKey = '';
}
