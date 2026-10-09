import React, { useState } from 'react';
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
} from 'react-native';
import { AppSettings, testServerConnection } from '../utils/settings';
import { haptics } from '../utils/haptics';

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
          <View>
            <Text style={styles.headerTitle}>STATION CONFIGURATION</Text>
            <Text style={styles.headerSubtitle}>Hardware & Network Diagnostics</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              haptics.tap();
              onClose();
            }}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} bounces={false}>
          {/* Server Connection Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>BACKEND COMPLIANCE SERVER</Text>
            <Text style={styles.fieldLabel}>API ENDPOINT URL:</Text>
            <TextInput
              style={styles.input}
              value={formData.apiBaseUrl}
              onChangeText={text => setFormData({ ...formData, apiBaseUrl: text })}
              placeholder="https://...trycloudflare.com or https://api.yourdomain.com"
              placeholderTextColor="#64748b"
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
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.testBtnText}>TEST SERVER CONNECTION</Text>
                )}
              </TouchableOpacity>

              {testResult && (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: testResult.success ? '#064e3b' : '#7f1d1d' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: testResult.success ? '#34d399' : '#f87171' },
                    ]}
                  >
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Station Profile Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>STATION PROFILE</Text>

            <Text style={styles.fieldLabel}>STATION NAME:</Text>
            <TextInput
              style={styles.input}
              value={formData.stationName}
              onChangeText={text => setFormData({ ...formData, stationName: text })}
              placeholder="e.g. GAIL Gas Sector 22"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.fieldLabel}>DISPENSER BAY / PUMP ID:</Text>
            <TextInput
              style={styles.input}
              value={formData.bayNumber}
              onChangeText={text => setFormData({ ...formData, bayNumber: text })}
              placeholder="e.g. Bay 02 - Fast Fill"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.fieldLabel}>ATTENDANT / OPERATOR ID:</Text>
            <TextInput
              style={styles.input}
              value={formData.operatorId}
              onChangeText={text => setFormData({ ...formData, operatorId: text })}
              placeholder="e.g. Attendant Shift #1"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Device & Hardware Settings */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>HARDWARE PREFERENCES</Text>

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
                <Text style={styles.toggleSubtext}>Tactile confirmation on scans and verification</Text>
              </View>
              <View
                style={[
                  styles.toggleBadge,
                  { backgroundColor: formData.enableHaptics ? '#10b981' : '#334155' },
                ]}
              >
                <Text style={styles.toggleBadgeText}>
                  {formData.enableHaptics ? 'ENABLED' : 'OFF'}
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
                <Text style={styles.toggleLabel}>Auto-Torch on Viewfinder</Text>
                <Text style={styles.toggleSubtext}>Automatically turn on camera flash during scans</Text>
              </View>
              <View
                style={[
                  styles.toggleBadge,
                  { backgroundColor: formData.autoTorch ? '#10b981' : '#334155' },
                ]}
              >
                <Text style={styles.toggleBadgeText}>
                  {formData.autoTorch ? 'ENABLED' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Save Action Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>SAVE CONFIGURATION</Text>
          </TouchableOpacity>

          {/* Enterprise Build Metadata */}
          <View style={styles.buildInfoContainer}>
            <Text style={styles.buildInfoTitle}>CNG COMPLIANCE GUARD ENTERPRISE</Text>
            <Text style={styles.buildInfoText}>Version 2.4.0 (Build 108) • Production Release</Text>
            <Text style={styles.buildInfoText}>PESO Gas Cylinder Safety Rules 2016 Compliant</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeBtnText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  testBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
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
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSubtext: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  toggleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 6,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  buildInfoContainer: {
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  buildInfoTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  buildInfoText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
