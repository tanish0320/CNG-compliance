import AsyncStorage from '@react-native-async-storage/async-storage';
import { ComplianceStatus } from '../types/compliance';

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  registration: string;
  status: ComplianceStatus;
  confidence: number;
  source: 'CAMERA' | 'GALLERY' | 'MANUAL';
}

const STORAGE_KEY = '@cng_scan_history_v1';
const MAX_HISTORY_ITEMS = 30;

export async function loadScanHistory(): Promise<ScanHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[History] Failed to load scan history:', error);
    return [];
  }
}

export async function saveScanItem(item: Omit<ScanHistoryItem, 'id' | 'timestamp'>): Promise<ScanHistoryItem[]> {
  try {
    const existing = await loadScanHistory();
    const newItem: ScanHistoryItem = {
      ...item,
      id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newItem, ...existing].slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[History] Failed to save scan item:', error);
    return [];
  }
}

export async function clearScanHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[History] Failed to clear scan history:', error);
  }
}
