import React, { useState, useEffect } from 'react';
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
import { haptics } from '../utils/haptics';

interface Props {
  ocrData: OcrExtractResponse;
  imageInput: ImageInput | null;
  onReset: () => void;
  onSelectGallery: () => void;
  onConfirmManualReview?: (confirmedRegistration: string) => Promise<void>;
}

interface StatusTheme {
  title: string;
  subtitle: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  verdictCode: string;
  dispenseVerdict: 'ALLOWED' | 'DENIED' | 'REVIEW';
  verdictText: string;
}

const STATUS_THEMES: Record<ComplianceStatus, StatusTheme> = {
  VALID: {
    title: 'DISPENSE AUTHORIZED',
    subtitle: 'Cylinder compliance certified and active under PESO safety rules.',
    badgeBg: '#052e16',
    badgeBorder: '#10b981',
    textColor: '#34d399',
    verdictCode: 'PASS',
    dispenseVerdict: 'ALLOWED',
    verdictText: 'SAFE TO FUEL',
  },
  EXPIRING_SOON: {
    title: 'DISPENSE WITH WARNING',
    subtitle: 'Hydrotest certificate expires in less than 30 days. Re-test required soon.',
    badgeBg: '#451a03',
    badgeBorder: '#f59e0b',
    textColor: '#fbbf24',
    verdictCode: 'WARN',
    dispenseVerdict: 'ALLOWED',
    verdictText: 'EXPIRING SOON',
  },
  EXPIRED: {
    title: 'DO NOT DISPENSE',
    subtitle: 'Hydrotest expired. Refueling prohibited under PESO gas cylinder regulations.',
    badgeBg: '#450a0a',
    badgeBorder: '#ef4444',
    textColor: '#f87171',
    verdictCode: 'STOP',
    dispenseVerdict: 'DENIED',
    verdictText: 'FUELING PROHIBITED',
  },
  INVALID: {
    title: 'INVALID COMPLIANCE',
    subtitle: 'Compliance certificate is invalid or revoked. Refueling denied.',
    badgeBg: '#450a0a',
    badgeBorder: '#ef4444',
    textColor: '#f87171',
    verdictCode: 'FAIL',
    dispenseVerdict: 'DENIED',
    verdictText: 'FUELING PROHIBITED',
  },
  NOT_FOUND: {
    title: 'NO RECORD FOUND',
    subtitle: 'No registered CNG certificate located in compliance database.',
    badgeBg: '#1e293b',
    badgeBorder: '#64748b',
    textColor: '#cbd5e1',
    verdictCode: 'NONE',
    dispenseVerdict: 'DENIED',
    verdictText: 'UNREGISTERED CYLINDER',
  },
  MANUAL_REVIEW: {
    title: 'MANUAL REVIEW REQUIRED',
    subtitle: 'OCR confidence below threshold. Attendant confirmation required.',
    badgeBg: '#3b0764',
    badgeBorder: '#a855f7',
    textColor: '#c084fc',
    verdictCode: 'EDIT',
    dispenseVerdict: 'REVIEW',
    verdictText: 'OPERATOR CHECK REQUIRED',
  },
  PROVIDER_UNAVAILABLE: {
    title: 'PROVIDER OFFLINE',
    subtitle: 'Central compliance verification database is temporarily unreachable.',
    badgeBg: '#431407',
    badgeBorder: '#ea580c',
    textColor: '#fb923c',
    verdictCode: 'DOWN',
    dispenseVerdict: 'DENIED',
    verdictText: 'SYSTEM OFFLINE',
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
  const status: ComplianceStatus =
    verification?.status || (ocrData.manual_review_required ? 'MANUAL_REVIEW' : 'NOT_FOUND');
  const theme = STATUS_THEMES[status] || STATUS_THEMES.MANUAL_REVIEW;

  const registrationText =
    verification?.vehicle_registration &&
    verification.vehicle_registration !== 'NO_PLATE_DETECTED'
      ? verification.vehicle_registration
      : ocrData.formatted_registration || ocrData.normalized_registration || ocrData.raw_text || 'UNREADABLE';

  const [editedReg, setEditedReg] = useState<string>(
    registrationText !== 'UNREADABLE' && registrationText !== 'NO_PLATE_DETECTED'
      ? registrationText
      : ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showAuditDetails, setShowAuditDetails] = useState<boolean>(false);

  const isManualReview = status === 'MANUAL_REVIEW' || ocrData.manual_review_required;

  useEffect(() => {
    if (status === 'VALID') {
      haptics.success();
    } else if (status === 'EXPIRED' || status === 'INVALID') {
      haptics.error();
    } else if (status === 'EXPIRING_SOON' || status === 'MANUAL_REVIEW') {
      haptics.warning();
    }
  }, [status]);

  let expiryDisplay = 'N/A';
  let daysRemainingText = '';
  if (verification?.expires_at) {
    try {
      const expDate = new Date(verification.expires_at);
      expiryDisplay = expDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        daysRemainingText = `${diffDays} DAYS REMAINING`;
      } else {
        daysRemainingText = `EXPIRED ${Math.abs(diffDays)} DAYS AGO`;
      }
    } catch {
      expiryDisplay = verification.expires_at;
    }
  }

  const handleSwapChar = (charA: string, charB: string) => {
    setEditedReg(prev => {
      const upper = prev.toUpperCase();
      if (upper.includes(charA)) {
        return upper.replace(charA, charB);
      } else if (upper.includes(charB)) {
        return upper.replace(charB, charA);
      }
      return upper;
    });
  };

  const handleConfirmVerification = async () => {
    const trimmed = editedReg.trim().toUpperCase().replace(/\s+/g, '');
    if (!trimmed || trimmed.length < 4) {
      Alert.alert('Validation Error', 'Please enter a valid vehicle registration number (e.g. DL01AB1234)');
      return;
    }
    if (!onConfirmManualReview) {
      Alert.alert('Error', 'Manual verification handler is not configured');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmManualReview(trimmed);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Could not verify confirmed registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Navigation / Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.statusDot, { backgroundColor: theme.badgeBorder }]} />
            <Text style={styles.topBarTitle}>VERIFICATION RESULT</Text>
          </View>
          <TouchableOpacity
            onPress={onReset}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>

        {/* Major Attendant Dispense Decision Card */}
        <View style={[styles.decisionCard, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
          <View style={styles.decisionTopRow}>
            <View style={[styles.verdictPill, { borderColor: theme.badgeBorder }]}>
              <Text style={[styles.verdictPillText, { color: theme.textColor }]}>
                {theme.verdictText}
              </Text>
            </View>
            <View style={[styles.decisionCodeBox, { borderColor: theme.badgeBorder }]}>
              <Text style={[styles.decisionCodeText, { color: theme.textColor }]}>
                {theme.verdictCode}
              </Text>
            </View>
          </View>

          <Text style={styles.decisionTitle}>{theme.title}</Text>
          <Text style={styles.decisionSubtitle}>{theme.subtitle}</Text>

          {daysRemainingText ? (
            <View style={styles.daysBadge}>
              <Text style={[styles.daysBadgeText, { color: theme.textColor }]}>
                {daysRemainingText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* High-Contrast Indian HSRP License Plate Visual */}
        <View style={styles.plateWrapper}>
          <Text style={styles.sectionCaption}>DETECTED VEHICLE REGISTRATION</Text>
          <View style={styles.hsrpPlate}>
            {/* Blue IND Strip */}
            <View style={styles.hsrpIndStrip}>
              <View style={styles.hsrpEmblemSquare} />
              <Text style={styles.hsrpIndText}>IND</Text>
            </View>
            {/* Plate Registration Number */}
            <View style={styles.hsrpNumberContainer}>
              <Text style={styles.hsrpNumberText} numberOfLines={1} adjustsFontSizeToFit>
                {registrationText}
              </Text>
            </View>
          </View>
        </View>

        {/* Operator Picture-in-Picture Manual Review Card */}
        {isManualReview && (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeaderRow}>
              <Text style={styles.reviewHeaderTitle}>MANUAL PLATE CORRECTION</Text>
              <Text style={styles.reviewConfidenceBadge}>
                {(ocrData.confidence * 100).toFixed(0)}% CONF
              </Text>
            </View>

            {/* Picture-in-Picture Plate Image Crop Preview */}
            {imageInput && (
              <View style={styles.pipContainer}>
                <Image
                  source={{ uri: imageInput.uri }}
                  style={styles.pipImage}
                  resizeMode="contain"
                />
                <View style={styles.pipLabelBadge}>
                  <Text style={styles.pipLabelText}>CAPTURED IMAGE PREVIEW</Text>
                </View>
              </View>
            )}

            {/* Quick-Fix Character Substitution Chips */}
            <Text style={styles.quickFixCaption}>QUICK FIX CHARACTER SUBSTITUTIONS:</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSwapChar('0', 'O')}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>0 / O</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSwapChar('1', 'I')}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>1 / I</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSwapChar('8', 'B')}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>8 / B</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSwapChar('5', 'S')}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>5 / S</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chipBtn, styles.chipClear]}
                onPress={() => setEditedReg('')}
                activeOpacity={0.7}
              >
                <Text style={styles.chipClearText}>CLEAR</Text>
              </TouchableOpacity>
            </View>

            {/* Editable Registration Input */}
            <Text style={styles.inputFieldLabel}>CONFIRM NUMBER PLATE:</Text>
            <TextInput
              style={styles.regInput}
              value={editedReg}
              onChangeText={text => setEditedReg(text.toUpperCase())}
              placeholder="e.g. DL01AB1234"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={14}
            />

            <TouchableOpacity
              style={[styles.confirmBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleConfirmVerification}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>VERIFY COMPLIANCE</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Cylinder & Compliance Specs Grid */}
        <View style={styles.specsGrid}>
          <View style={styles.specBox}>
            <Text style={styles.specLabel}>HYDROTEST EXPIRY</Text>
            <Text style={[styles.specValue, { color: theme.textColor }]}>{expiryDisplay}</Text>
          </View>

          <View style={styles.specBox}>
            <Text style={styles.specLabel}>CYLINDER ID</Text>
            <Text style={styles.specValue} numberOfLines={1}>
              {verification?.source_reference || verification?.compliance_id || 'CYL-VALIDATED'}
            </Text>
          </View>

          <View style={styles.specBox}>
            <Text style={styles.specLabel}>SAFETY RULESET</Text>
            <Text style={styles.specValue}>PESO Gas Rules 2016</Text>
          </View>

          <View style={styles.specBox}>
            <Text style={styles.specLabel}>ANPR ACCURACY</Text>
            <Text style={styles.specValue}>
              {(ocrData.confidence * 100).toFixed(0)}% ({ocrData.engine_name})
            </Text>
          </View>
        </View>

        {/* Forensic & Audit Accordion */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setShowAuditDetails(!showAuditDetails)}
          activeOpacity={0.7}
        >
          <Text style={styles.accordionTitle}>
            {showAuditDetails ? 'HIDE AUDIT LOG' : 'VIEW AUDIT LOG'}
          </Text>
        </TouchableOpacity>

        {showAuditDetails && (
          <View style={styles.auditDetailsCard}>
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Raw OCR String:</Text>
              <Text style={styles.auditValue}>{ocrData.raw_text || 'N/A'}</Text>
            </View>
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Normalized Plate:</Text>
              <Text style={styles.auditValue}>{ocrData.normalized_registration || 'N/A'}</Text>
            </View>
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Engine Model:</Text>
              <Text style={styles.auditValue}>{ocrData.engine_name}</Text>
            </View>
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Compliance ID:</Text>
              <Text style={styles.auditValue}>{verification?.compliance_id || 'N/A'}</Text>
            </View>
            {imageInput && (
              <View style={styles.auditColumn}>
                <Text style={styles.auditLabel}>SHA-256 Digest:</Text>
                <Text style={styles.auditHash} numberOfLines={1} selectable>
                  {imageInput.sha256}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons for Attendant */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.scanNextBtn}
            onPress={() => {
              haptics.tap();
              onReset();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.scanNextBtnText}>SCAN NEXT VEHICLE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={() => {
              haptics.tap();
              onSelectGallery();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.galleryBtnText}>SELECT FROM GALLERY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topBarTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  decisionCard: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 2,
    marginBottom: 16,
    elevation: 6,
  },
  decisionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verdictPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  verdictPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  decisionCodeBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  decisionCodeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  decisionTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  decisionSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  daysBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  plateWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionCaption: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  hsrpPlate: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#0f172a',
    borderRadius: 8,
    width: '100%',
    height: 66,
    alignItems: 'center',
    elevation: 4,
    overflow: 'hidden',
  },
  hsrpIndStrip: {
    backgroundColor: '#1d4ed8',
    width: 36,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1.5,
    borderRightColor: '#1e3a8a',
  },
  hsrpEmblemSquare: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 3,
  },
  hsrpIndText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hsrpNumberContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hsrpNumberText: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  reviewCard: {
    backgroundColor: '#1a102f',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#9333ea',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewHeaderTitle: {
    color: '#f0abfc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  reviewConfidenceBadge: {
    backgroundColor: '#3b0764',
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#7e22ce',
  },
  pipContainer: {
    backgroundColor: '#000000',
    borderRadius: 8,
    height: 140,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4c1d95',
  },
  pipImage: {
    width: '100%',
    height: '100%',
  },
  pipLabelBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pipLabelText: {
    color: '#c084fc',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickFixCaption: {
    color: '#c084fc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chipBtn: {
    backgroundColor: '#2e1065',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7e22ce',
  },
  chipText: {
    color: '#e9d5ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipClear: {
    backgroundColor: '#1e1b4b',
    borderColor: '#4338ca',
  },
  chipClearText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputFieldLabel: {
    color: '#e9d5ff',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  regInput: {
    backgroundColor: '#0f0a20',
    borderWidth: 1.5,
    borderColor: '#a855f7',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 12,
    marginBottom: 14,
  },
  confirmBtn: {
    backgroundColor: '#9333ea',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  specBox: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  specLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  specValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  accordionHeader: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    marginBottom: 12,
  },
  accordionTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  auditDetailsCard: {
    backgroundColor: '#0b1120',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
    gap: 8,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditColumn: {
    marginTop: 4,
  },
  auditLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  auditValue: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  auditHash: {
    color: '#38bdf8',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  actionContainer: {
    gap: 10,
    marginTop: 4,
  },
  scanNextBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
  },
  scanNextBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  galleryBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  galleryBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
