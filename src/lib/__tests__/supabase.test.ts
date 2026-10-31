import { beforeEach, describe, expect, it } from 'vitest';
import {
  getSupabaseClient,
  getSupabaseConfig,
  saveSupabaseConfig,
} from '../supabase';

describe('supabase client configuration & sandbox protection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to sandbox mode (unconfigured) on localhost so local dev never modifies production', () => {
    const config = getSupabaseConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.url).toBe('');
    expect(getSupabaseClient()).toBeNull();
  });

  it('connects to a custom/containerized Supabase instance when bpl_force_supabase is enabled', () => {
    localStorage.setItem('bpl_force_supabase', 'true');
    saveSupabaseConfig('http://127.0.0.1:54321', 'test-anon-jwt-token');

    const config = getSupabaseConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.url).toBe('http://127.0.0.1:54321');
    expect(config.anonKey).toBe('test-anon-jwt-token');

    const client = getSupabaseClient();
    expect(client).not.toBeNull();
  });

  it('clears stored config when saveSupabaseConfig is called with empty strings', () => {
    localStorage.setItem('bpl_force_supabase', 'true');
    saveSupabaseConfig('http://127.0.0.1:54321', 'test-anon-jwt-token');
    expect(getSupabaseConfig().isConfigured).toBe(true);

    saveSupabaseConfig('', '');
    expect(getSupabaseConfig().isConfigured).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });
});
