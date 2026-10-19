import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { AppSettings, testServerConnection } from '../utils/settings';
import { haptics } from '../utils/haptics';

const ANDROID_TOP_INSET =
  Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 38) : 0;
const ANDROID_BOTTOM_INSET = Platform.OS === 'android' ? 24 : 0;

interface Props {
  visible: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
}


export function StationSettingsModal({ visible, settings, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setFormData(settings);
      setTestResult(null);
    }
  }, [visible, settings]);

  const handleTestConnection = async () => {
    if (!formData.apiBaseUrl.trim()) {
      Alert.alert('Configuration Error', 'Please enter a valid server URL');
      return;
    }
    haptics.tap();
    setIsTesting(true);
    setTestResult(null);

    const result = await testServerConnection(formData.apiBaseUrl.trim());
    setIsTesting(false);
    setTestResult({ success: result.success, message: result.message });
    if (result.success) {
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const handleSave = () => {
    haptics.tap();
    if (!formData.apiBaseUrl.trim()) {
      Alert.alert('Required Field', 'Backend Server URL cannot be empty');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => {
                haptics.tap();
                onClose();
              }}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backBtnIcon}>←</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.headerSubtitle}>FORECOURT TERMINAL</Text>
              <Text style={styles.headerTitle}>Station Settings</Text>
            </View>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>PESO 2024</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container} bounces={false}>
          {/* Station Profile Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>STATION & BAY PROFILE</Text>
              <Text style={styles.cardHeaderTag}>Attendant Info</Text>
            </View>

            <Text style={styles.fieldLabel}>STATION NAME</Text>
            <TextInput
              style={styles.input}
              value={formData.stationName}
              onChangeText={text => setFormData({ ...formData, stationName: text })}
              placeholder="e.g. GAIL Gas Sector 22"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>DISPENSER BAY / LANE</Text>
            <TextInput
              style={styles.input}
              value={formData.bayNumber}
              onChangeText={text => setFormData({ ...formData, bayNumber: text })}
              placeholder="e.g. Lane 02 • Fast Fill"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>ATTENDANT / OPERATOR NAME</Text>
            <TextInput
              style={styles.input}
              value={formData.operatorId}
              onChangeText={text => setFormData({ ...formData, operatorId: text })}
              placeholder="e.g. Attendant Shift #1"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Server Connection Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>COMPLIANCE CLOUD ENDPOINT</Text>
              <Text style={styles.cardHeaderTag}>VAHAN / PESO Sync</Text>
            </View>
            <Text style={styles.fieldLabel}>SERVER API URL</Text>
            <TextInput
              style={styles.input}
              value={formData.apiBaseUrl}
              onChangeText={text => setFormData({ ...formData, apiBaseUrl: text })}
              placeholder="https://...trycloudflare.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.testRow}>
              <TouchableOpacity
                style={[styles.testBtn, isTesting && styles.btnDisabled]}
                onPress={handleTestConnection}
                disabled={isTesting}
                activeOpacity={0.8}
              >
                {isTesting ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <Text style={styles.testBtnText}>TEST CONNECTION</Text>
                )}
              </TouchableOpacity>

              {testResult && (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: testResult.success ? '#F0FDF4' : '#FEF2F2',
                      borderColor: testResult.success ? '#BBF7D0' : '#FECACA',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: testResult.success ? '#15803D' : '#DC2626' },
                    ]}
                  >
                    {testResult.success ? '✓ ' : '✕ '}
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Device & Hardware Settings */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>TERMINAL PREFERENCES</Text>
              <Text style={styles.cardHeaderTag}>Hardware</Text>
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => {
                haptics.tap();
                setFormData({ ...formData, enableHaptics: !formData.enableHaptics });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Haptic Vibration Feedback</Text>
                <Text style={styles.toggleSubtext}>Vibrate on pass/fail compliance verdicts</Text>
              </View>
              <View
                style={[
                  styles.toggleBadge,
                  formData.enableHaptics ? styles.toggleBadgeOn : styles.toggleBadgeOff,
                ]}
              >
                <Text
                  style={[
                    styles.toggleBadgeText,
                    formData.enableHaptics ? styles.toggleBadgeTextOn : styles.toggleBadgeTextOff,
                  ]}
                >
                  {formData.enableHaptics ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => {
                haptics.tap();
                setFormData({ ...formData, autoTorch: !formData.autoTorch });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Auto-Torch in Scanner</Text>
                <Text style={styles.toggleSubtext}>Turn on flashlight automatically for night shifts</Text>
              </View>
              <View
                style={[
                  styles.toggleBadge,
                  formData.autoTorch ? styles.toggleBadgeOn : styles.toggleBadgeOff,
                ]}
              >
                <Text
                  style={[
                    styles.toggleBadgeText,
                    formData.autoTorch ? styles.toggleBadgeTextOn : styles.toggleBadgeTextOff,
                  ]}
                >
                  {formData.autoTorch ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Save Action Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>SAVE SETTINGS</Text>
          </TouchableOpacity>

          <View style={styles.buildInfoContainer}>
            <Text style={styles.buildInfoTitle}>CNG COMPLIANCE ENTERPRISE • FIELD STANDARD</Text>
            <Text style={styles.buildInfoText}>PESO & CCOE Forecourt Safety Protocol Compliant</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12 + ANDROID_TOP_INSET,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnIcon: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  badgePill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgePillText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  container: {
    padding: 16,
    paddingBottom: 40 + ANDROID_BOTTOM_INSET,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeader: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardHeaderTag: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  testBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSubtext: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  toggleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBadgeOn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  toggleBadgeOff: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toggleBadgeTextOn: {
    color: '#15803D',
  },
  toggleBadgeTextOff: {
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  saveBtn: {
    backgroundColor: '#15803D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  buildInfoContainer: {
    alignItems: 'center',
    marginTop: 12,
    gap: 3,
  },
  buildInfoTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buildInfoText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
