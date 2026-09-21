import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Authoritative Supabase project configuration - PortalGoioereeassim
export const ACTIVE_SUPABASE_CONFIG = {
  url: 'https://mtesngxvdzfzcorjozna.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10ZXNuZ3h2ZHpmemNvcmpvem5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDExNzgsImV4cCI6MjEwNTQ3NzE3OH0.dSb27thQBFvtO1kN66YsfiSitOP_dKEMc2aT6joJCa4',
  projectId: 'mtesngxvdzfzcorjozna',
  projectName: 'PortalGoioereeassim',
  apiUrl: 'https://mtesngxvdzfzcorjozna.supabase.co/rest/v1/',
  autoSync: true,
};

export const DEFAULT_SUPABASE_CONFIG = ACTIVE_SUPABASE_CONFIG;

const STORAGE_KEY_SUPABASE = 'portal_supabase_custom_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
  projectId?: string;
  projectName?: string;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const envKey = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) || '';

  const activeUrl = cleanSupabaseUrl(envUrl || ACTIVE_SUPABASE_CONFIG.url);
  const activeKey = (envKey || ACTIVE_SUPABASE_CONFIG.anonKey || '').trim();

  return {
    url: activeUrl,
    anonKey: activeKey,
    autoSync: true,
    projectId: ACTIVE_SUPABASE_CONFIG.projectId,
    projectName: ACTIVE_SUPABASE_CONFIG.projectName,
  };
};

export const saveSupabaseConfig = (config: Partial<SupabaseConfig>): SupabaseConfig => {
  const current = getSupabaseConfig();
  return {
    url: config.url ? cleanSupabaseUrl(config.url) : current.url,
    anonKey: config.anonKey !== undefined ? config.anonKey.trim() : current.anonKey,
    autoSync: config.autoSync !== undefined ? config.autoSync : true,
    projectId: ACTIVE_SUPABASE_CONFIG.projectId,
    projectName: ACTIVE_SUPABASE_CONFIG.projectName,
  };
};

// Normalizes and strictly validates URL (adds https:// if protocol omitted, strips /rest/v1 or trailing slashes)
export const cleanSupabaseUrl = (rawUrl: unknown): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return ACTIVE_SUPABASE_CONFIG.url;
  let url = rawUrl.trim();
  if (!url || url === 'undefined' || url === 'null' || url === '[object Object]') {
    return ACTIVE_SUPABASE_CONFIG.url;
  }

  // If starts with another non-http protocol like ftp://, fall back
  if (url.includes('://') && !url.startsWith('http://') && !url.startsWith('https://')) {
    return ACTIVE_SUPABASE_CONFIG.url;
  }

  // Prepend https:// if user entered domain without protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Strip trailing slash
  url = url.replace(/\/+$/, '');
  // Strip /rest/v1 if included
  url = url.replace(/\/rest\/v1\/?$/, '');
  // Strip trailing slash again
  url = url.replace(/\/+$/, '');

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ACTIVE_SUPABASE_CONFIG.url;
    }
    return url;
  } catch {
    return ACTIVE_SUPABASE_CONFIG.url;
  }
};

let cachedClient: SupabaseClient | null = null;
let currentConfigKey = '';

export const getSupabaseClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  const validUrl = cleanSupabaseUrl(config.url);
  const validKey = config.anonKey?.trim() || 'anon-key-placeholder';
  const configKey = `${validUrl}::${validKey}`;

  if (!cachedClient || currentConfigKey !== configKey) {
    try {
      cachedClient = createClient(validUrl, validKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      currentConfigKey = configKey;
    } catch (err) {
      console.warn('[SupabaseClient] Erro ao inicializar cliente com URL personalizada:', err);
      cachedClient = createClient(ACTIVE_SUPABASE_CONFIG.url, validKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      currentConfigKey = `${ACTIVE_SUPABASE_CONFIG.url}::${validKey}`;
    }
  }

  return cachedClient;
};

export const initSupabaseClient = (): SupabaseClient => {
  cachedClient = null;
  return getSupabaseClient();
};

// Test connection
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: unknown;
}> => {
  const startTime = performance.now();
  const config = getSupabaseConfig();

  if (!config.anonKey) {
    return {
      success: false,
      message: 'Chave anônima (anon public key) do Supabase pendente. Configure a variável VITE_SUPABASE_ANON_KEY no painel de configurações (Settings).',
      latencyMs: 0,
      details: {
        projectId: ACTIVE_SUPABASE_CONFIG.projectId,
        projectName: ACTIVE_SUPABASE_CONFIG.projectName,
        url: config.url,
      }
    };
  }

  try {
    const client = getSupabaseClient();
    // Try querying either portal_records or registros_do_portal
    let { data, error } = await client
      .from('portal_records')
      .select('key')
      .limit(1);

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      const alt = await client.from('registros_do_portal').select('key').limit(1);
      if (!alt.error) {
        error = null;
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      // If table doesn't exist yet (PGRST204 or 42P01), connection to Supabase itself succeeded!
      if (
        error.code === 'PGRST204' || 
        error.code === '42P01' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('relation')
      ) {
        return {
          success: true,
          message: `Conexão com o Supabase PortalGoioereeassim (${latencyMs}ms) estabelecida com sucesso! Tabelas prontas para inicialização via script SQL.`,
          latencyMs,
          details: error.message,
        };
      }

      // Check if it's an auth or invalid key error
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('API key')) {
        return {
          success: false,
          message: `Erro de chave API no Supabase (${error.message}). Verifique a chave anônima (anon public key) do projeto PortalGoioereeassim (mtesngxvdzfzcorjozna).`,
          latencyMs,
          details: error,
        };
      }

      // Any other database response indicates reachability
      return {
        success: true,
        message: `Supabase conectado (${latencyMs}ms). Resposta: ${error.message}`,
        latencyMs,
        details: error,
      };
    }

    return {
      success: true,
      message: `Conectado ao Supabase PortalGoioereeassim com sucesso! (${latencyMs}ms)`,
      latencyMs,
      details: data,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Falha ao conectar com o Supabase: ${errorMessage}`,
      latencyMs,
      details: err,
    };
  }
};
