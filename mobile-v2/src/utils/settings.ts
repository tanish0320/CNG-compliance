import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  apiBaseUrl: string;
  stationName: string;
  bayNumber: string;
  operatorId: string;
  enableHaptics: boolean;
  autoTorch: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: 'https://ozone-equality-consequences-hoping.trycloudflare.com',
  stationName: 'GAIL Gas Sector 22',
  bayNumber: 'Bay 02 - Fast Fill',
  operatorId: 'Attendant Shift #1',
  enableHaptics: true,
  autoTorch: false,
};

const SETTINGS_KEY = '@cng_app_settings_v2';

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (parsed.apiBaseUrl && (parsed.apiBaseUrl.includes('192.168.') || parsed.apiBaseUrl.includes('localhost') || parsed.apiBaseUrl.includes('10.0.2.2'))) {
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

export async function testServerConnection(url: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    // Trim trailing slash
    const sanitizedUrl = url.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${sanitizedUrl}/docs`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - start;
    if (res.status === 200 || res.status === 404 || res.status === 307) {
      return { success: true, latencyMs, message: `Connected (${latencyMs}ms)` };
    }
    return { success: false, latencyMs, message: `HTTP ${res.status}` };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg = err.name === 'AbortError' ? 'Connection Timed Out (4s)' : (err.message || 'Network Error');
    return { success: false, latencyMs, message: msg };
  }
}
