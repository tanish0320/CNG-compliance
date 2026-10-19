import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  apiBaseUrl: string;
  stationName: string;
  bayNumber: string;
  operatorId: string;
  enableHaptics: boolean;
  autoTorch: boolean;
}

export const CLOUDFLARE_TUNNEL_URL = 'https://caught-sandra-delete-bennett.trycloudflare.com';
export const LOCAL_ADB_REVERSE_URL = 'http://127.0.0.1:8000';

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: CLOUDFLARE_TUNNEL_URL,
  stationName: 'GAIL Gas Sector 22',
  bayNumber: 'Bay 02 - Fast Fill',
  operatorId: 'Attendant Shift #1',
  enableHaptics: true,
  autoTorch: false,
};

const SETTINGS_KEY = '@cng_app_settings_v6';

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (
      parsed.apiBaseUrl &&
      parsed.apiBaseUrl.includes('trycloudflare.com') &&
      parsed.apiBaseUrl !== DEFAULT_SETTINGS.apiBaseUrl
    ) {
      parsed.apiBaseUrl = DEFAULT_SETTINGS.apiBaseUrl;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.warn('[Settings] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[Settings] Failed to save settings:', error);
  }
}

export function getCandidateBaseUrls(primaryUrl: string): string[] {
  const cleanPrimary = (primaryUrl || '').trim().replace(/\/+$/, '');
  const candidates = [cleanPrimary, LOCAL_ADB_REVERSE_URL, CLOUDFLARE_TUNNEL_URL].filter(Boolean);
  return Array.from(new Set(candidates));
}

export async function fetchWithFallback(
  primaryBaseUrl: string,
  endpointPath: string,
  init?: RequestInit
): Promise<{ response: Response; usedBaseUrl: string }> {
  const candidates = getCandidateBaseUrls(primaryBaseUrl);
  let lastError: any = null;

  for (const baseUrl of candidates) {
    try {
      const targetUrl = `${baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
      const response = await fetch(targetUrl, init);
      return { response, usedBaseUrl: baseUrl };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Network request failed across all endpoints');
}

export async function testServerConnection(
  url: string
): Promise<{ success: boolean; latencyMs: number; message: string; activeUrl?: string }> {
  const candidates = getCandidateBaseUrls(url);
  for (const candidate of candidates) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${candidate}/docs`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      if (res.status === 200 || res.status === 404 || res.status === 307) {
        return {
          success: true,
          latencyMs,
          message: `Connected (${latencyMs}ms)`,
          activeUrl: candidate,
        };
      }
    } catch {
      // try next candidate
    }
  }

  return { success: false, latencyMs: 0, message: 'Server Unreachable' };
}

