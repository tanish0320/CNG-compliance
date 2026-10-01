import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ImageInput, OcrExtractResponse, ComplianceStatus } from '../types/compliance';

interface Props {
  ocrData: OcrExtractResponse;
  imageInput: ImageInput | null;
  onReset: () => void;
  onSelectGallery: () => void;
  onConfirmManualReview?: (confirmedRegistration: string) => Promise<void>;
}

interface StatusTheme {
  title: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
  description: string;
}

const STATUS_THEMES: Record<ComplianceStatus, StatusTheme> = {
  VALID: {
    title: 'COMPLIANT VEHICLE',
    badgeBg: '#15803d',
    badgeText: '#ffffff',
    icon: '✅',
    description: 'Vehicle CNG cylinder compliance is active and valid.',
  },
  EXPIRING_SOON: {
    title: 'EXPIRING SOON',
    badgeBg: '#b45309',
    badgeText: '#ffffff',
    icon: '⚠️',
    description: 'CNG compliance expires in the near future. Re-test required soon.',
  },
  EXPIRED: {
    title: 'COMPLIANCE EXPIRED',
    badgeBg: '#b91c1c',
    badgeText: '#ffffff',
    icon: '🚨',
    description: 'CNG compliance has expired. Vehicle is NOT compliant for re-fueling.',
  },
  INVALID: {
    title: 'INVALID COMPLIANCE',
    badgeBg: '#b91c1c',
    badgeText: '#ffffff',
    icon: '❌',
    description: 'Compliance certificate is invalid or revoked.',
  },
  NOT_FOUND: {
    title: 'NO RECORD FOUND',
    badgeBg: '#475569',
    badgeText: '#ffffff',
    icon: '🔍',
    description: 'No registration record found in the CNG compliance database.',
  },
  MANUAL_REVIEW: {
    title: 'MANUAL REVIEW REQUIRED',
    badgeBg: '#6b21a8',
    badgeText: '#ffffff',
    icon: '👁️',
    description: 'Registration could not be read with sufficient confidence. Review or edit the registration before verification.',
  },
  PROVIDER_UNAVAILABLE: {
    title: 'PROVIDER UNAVAILABLE',
    badgeBg: '#c2410c',
    badgeText: '#ffffff',
    icon: '⚡',
    description: 'Compliance verification provider is temporarily unreachable.',
  },
};

export function ComplianceResultView({
  ocrData,
  imageInput,
  onReset,
  onSelectGallery,
  onConfirmManualReview,
}: Props) {
  const verification = ocrData.verification_result;
  const status: ComplianceStatus = verification?.status || 'MANUAL_REVIEW';
  const theme = STATUS_THEMES[status] || STATUS_THEMES.MANUAL_REVIEW;

  const registrationText =
    verification?.vehicle_registration &&
    verification.vehicle_registration !== 'NO_PLATE_DETECTED'
      ? verification.vehicle_registration
      : ocrData.formatted_registration || ocrData.normalized_registration || ocrData.raw_text || 'UNREADABLE PLATE';

  const [editedReg, setEditedReg] = useState<string>(
    registrationText !== 'UNREADABLE PLATE' && registrationText !== 'NO_PLATE_DETECTED'
      ? registrationText
      : ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleConfirmVerification = async () => {
    if (!editedReg || !editedReg.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid vehicle registration number');
      return;
    }
    if (!onConfirmManualReview) {
      Alert.alert('Error', 'Manual verification handler is not configured');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmManualReview(editedReg.trim());
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Could not verify confirmed registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedExpiry = verification?.expires_at
    ? new Date(verification.expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CNG COMPLIANCE RESULT</Text>
          <TouchableOpacity onPress={onReset} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ CLOSE</Text>
          </TouchableOpacity>
        </View>

        {/* Major Status Banner Card */}
        <View style={[styles.statusBanner, { backgroundColor: theme.badgeBg }]}>
          <Text style={styles.statusIcon}>{theme.icon}</Text>
          <Text style={styles.statusTitle}>{theme.title}</Text>
          <Text style={styles.statusDescription}>{theme.description}</Text>
        </View>

        {/* Operator Manual Review & Correction Section */}
        {(status === 'MANUAL_REVIEW' || ocrData.manual_review_required) && (
          <View style={styles.manualCorrectionCard}>
            <Text style={styles.manualCorrectionHeader}>✏️ OPERATOR MANUAL CORRECTION WORKFLOW</Text>
            <Text style={styles.manualCorrectionText}>
              Registration could not be read with sufficient confidence ({ (ocrData.confidence * 100).toFixed(1) }%).
              Verify or edit the registration below before requesting compliance verification:
            </Text>

            <View style={styles.manualDetailRow}>
              <Text style={styles.manualDetailLabel}>Detected Registration:</Text>
              <Text style={styles.manualDetailValReg}>{registrationText}</Text>
            </View>

            <View style={styles.manualDetailRow}>
              <Text style={styles.manualDetailLabel}>OCR Confidence:</Text>
              <Text style={styles.manualDetailVal}>{ (ocrData.confidence * 100).toFixed(1) }%</Text>
            </View>

            <View style={styles.manualDetailRow}>
              <Text style={styles.manualDetailLabel}>Raw Recognized OCR:</Text>
              <Text style={styles.manualDetailVal}>{ocrData.raw_text || 'N/A'}</Text>
            </View>

            <Text style={styles.inputLabel}>ENTER CORRECTED REGISTRATION:</Text>
            <TextInput
              style={styles.regInput}
              value={editedReg}
              onChangeText={setEditedReg}
              placeholder="e.g. RJ32GD9600"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.verifyBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleConfirmVerification}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>VERIFY CNG COMPLIANCE</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* License Plate Graphic Display */}
        <View style={styles.plateContainer}>
          <View style={styles.plateBorder}>
            <View style={styles.plateIndStrip}>
              <Text style={styles.indText}>IND</Text>
            </View>
            <View style={styles.plateTextContainer}>
              <Text style={styles.plateText}>{registrationText}</Text>
            </View>
          </View>
        </View>

        {/* Verification Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>📋 Verification Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status Code:</Text>
            <Text style={[styles.value, { color: theme.badgeBg, fontWeight: 'bold' }]}>
              {status}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Compliance ID:</Text>
            <Text style={styles.value}>{verification?.compliance_id || 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Expiry Date:</Text>
            <Text style={styles.value}>{formattedExpiry}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Source Reference:</Text>
            <Text style={styles.value}>{verification?.source_reference || 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Rule Engine Version:</Text>
            <Text style={styles.value}>{verification?.rule_version || 'v1'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Manual Review Needed:</Text>
            <Text style={styles.value}>
              {ocrData.manual_review_required || verification?.manual_review_required
                ? 'YES'
                : 'NO'}
            </Text>
          </View>
        </View>

        {/* OCR Diagnostics & Audit Evidence Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🔍 OCR & Forensic Audit Evidence</Text>

          {imageInput && (
            <View style={styles.imagePreviewRow}>
              <Image source={{ uri: imageInput.uri }} style={styles.thumbImage} resizeMode="cover" />
              <View style={styles.imageMeta}>
                <Text style={styles.metaText}>Source: {imageInput.source}</Text>
                <Text style={styles.metaText}>
                  File Size: {(imageInput.size / 1024).toFixed(1)} KB
                </Text>
                <Text style={styles.metaText}>Format: {imageInput.mimeType}</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>OCR Engine:</Text>
            <Text style={styles.value}>{ocrData.engine_name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>OCR Confidence:</Text>
            <Text style={styles.value}>{(ocrData.confidence * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Raw Recognized Text:</Text>
            <Text style={styles.value}>{ocrData.raw_text || 'N/A'}</Text>
          </View>

          {imageInput && (
            <>
              <View style={styles.divider} />
              <View style={styles.column}>
                <Text style={styles.label}>Image SHA-256 Digest:</Text>
                <Text style={styles.hashValue} numberOfLines={1} selectable>
                  {imageInput.sha256}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={onReset}>
            <Text style={styles.primaryButtonText}>📷 SCAN AGAIN / LIVE CAMERA</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onSelectGallery}>
            <Text style={styles.secondaryButtonText}>🖼️ CHOOSE FROM GALLERY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBanner: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  statusIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  statusDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  plateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  plateBorder: {
    flexDirection: 'row',
    backgroundColor: '#fef08a',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 8,
    width: 280,
    height: 64,
    alignItems: 'center',
    elevation: 5,
  },
  plateIndStrip: {
    backgroundColor: '#1d4ed8',
    width: 32,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  indText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  plateTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  column: {
    paddingVertical: 6,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
  },
  value: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  hashValue: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  imageMeta: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  metaText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 2,
  },
  actionContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  manualCorrectionCard: {
    backgroundColor: '#3b0764',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  manualCorrectionHeader: {
    color: '#f0abfc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  manualCorrectionText: {
    color: '#e9d5ff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  manualDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  manualDetailLabel: {
    color: '#c084fc',
    fontSize: 12,
  },
  manualDetailValReg: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualDetailVal: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#f0abfc',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  regInput: {
    backgroundColor: '#1e1b4b',
    borderWidth: 1.5,
    borderColor: '#c084fc',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  verifyBtn: {
    backgroundColor: '#9333ea',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
