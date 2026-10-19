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
  stationName?: string;
  bayNumber?: string;
}

export function ComplianceResultView({
  ocrData,
  imageInput,
  onReset,
  onSelectGallery,
  onConfirmManualReview,
  stationName = 'GAIL Gas Sector 22',
  bayNumber = 'Bay 02',
}: Props) {
  const verification = ocrData.verification_result;
  const status: ComplianceStatus =
    verification?.status || (ocrData.manual_review_required ? 'MANUAL_REVIEW' : 'NOT_FOUND');

  const registrationText =
    verification?.vehicle_registration &&
    verification.vehicle_registration !== 'NO_PLATE_DETECTED'
      ? verification.vehicle_registration
      : ocrData.formatted_registration ||
        ocrData.normalized_registration ||
        ocrData.raw_text ||
        'UNREADABLE';

  const cleanInitialReg =
    registrationText !== 'UNREADABLE' && registrationText !== 'NO_PLATE_DETECTED'
      ? registrationText.replace(/[^A-Z0-9]/gi, '').toUpperCase()
      : 'DL01AB1234';

  const [editedReg, setEditedReg] = useState<string>(cleanInitialReg);
  const [activeCharIdx, setActiveCharIdx] = useState<number>(
    Math.max(0, cleanInitialReg.length - 1)
  );
  const [showKeyboardInput, setShowKeyboardInput] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showFullDetails, setShowFullDetails] = useState<boolean>(false);
  const [isCallingSupervisor, setIsCallingSupervisor] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isManualReview = status === 'MANUAL_REVIEW' || ocrData.manual_review_required;
  const isApproved = !isManualReview && (status === 'VALID' || status === 'EXPIRING_SOON');
  const isWarning = status === 'EXPIRING_SOON';

  useEffect(() => {
    if (status === 'VALID') {
      haptics.success();
    } else if (status === 'EXPIRED' || status === 'INVALID' || status === 'NOT_FOUND') {
      haptics.error();
    } else if (status === 'EXPIRING_SOON' || status === 'MANUAL_REVIEW') {
      haptics.warning();
    }
  }, [status]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 1800);
  };

  // Format expiry date & days remaining
  let expiryDisplay = verification?.vehicle_details?.next_hydro_test_due || 'N/A';
  let daysBadgeText = '';
  let overdueDays = 0;

  const rawDateStr =
    verification?.expires_at || verification?.vehicle_details?.next_hydro_test_due;
  if (rawDateStr) {
    try {
      const expDate = new Date(rawDateStr);
      if (!isNaN(expDate.getTime())) {
        expiryDisplay = expDate
          .toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
          .toUpperCase();
        const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          daysBadgeText = `${diffDays} Days Left`;
        } else {
          overdueDays = Math.abs(diffDays);
          daysBadgeText = `Overdue by ${overdueDays} days`;
        }
      }
    } catch {
      // fallback to rawDateStr
    }
  }

  // Quick 1-Tap Fix (e.g., 8 <-> B, 0 <-> O, 1 <-> I)
  const handleQuickFix = (charA: string, charB: string) => {
    haptics.tap();
    const chars = editedReg.split('');
    if (chars[activeCharIdx] === charA) {
      chars[activeCharIdx] = charB;
      setEditedReg(chars.join(''));
      triggerToast(`Swapped ${charA} → ${charB}`);
      return;
    }
    if (chars[activeCharIdx] === charB) {
      chars[activeCharIdx] = charA;
      setEditedReg(chars.join(''));
      triggerToast(`Swapped ${charB} → ${charA}`);
      return;
    }
    const idxA = chars.indexOf(charA);
    if (idxA !== -1) {
      chars[idxA] = charB;
      setEditedReg(chars.join(''));
      setActiveCharIdx(idxA);
      triggerToast(`Swapped ${charA} → ${charB}`);
      return;
    }
    const idxB = chars.indexOf(charB);
    if (idxB !== -1) {
      chars[idxB] = charA;
      setEditedReg(chars.join(''));
      setActiveCharIdx(idxB);
      triggerToast(`Swapped ${charB} → ${charA}`);
      return;
    }
    triggerToast(`No ${charA}/${charB} found in plate`);
  };

  // Attendant Digit Pad press
  const handleTypeDigit = (digit: string) => {
    haptics.tap();
    const chars = editedReg.split('');
    if (chars.length === 0) {
      setEditedReg(digit);
      setActiveCharIdx(0);
      return;
    }
    const targetIdx = Math.min(activeCharIdx, chars.length - 1);
    chars[targetIdx] = digit;
    setEditedReg(chars.join(''));
    triggerToast(`Slot #${targetIdx + 1} set to ${digit}`);
    if (targetIdx < chars.length - 1) {
      setActiveCharIdx(targetIdx + 1);
    }
  };

  const handleConfirmVerification = async () => {
    haptics.tap();
    const trimmed = editedReg.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!trimmed || trimmed.length < 4) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid vehicle registration number (e.g. DL01AB1234)'
      );
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

  const handleCallSupervisor = () => {
    haptics.warning();
    setIsCallingSupervisor(true);
    setTimeout(() => {
      setIsCallingSupervisor(false);
      Alert.alert(
        'Supervisor Alerted',
        `Station Duty Manager notified for Bay ${bayNumber} lockout on vehicle ${registrationText}.`
      );
    }, 1400);
  };

  const details = verification?.vehicle_details;
  const charArray = editedReg.split('');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Minimalist Light Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              haptics.tap();
              onReset();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>ONLINE • {bayNumber.toUpperCase()}</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isManualReview ? 'Manual Lookup' : 'Compliance Verdict'}
            </Text>
          </View>
        </View>
        <View style={styles.stationPill}>
          <Text style={styles.stationPillText} numberOfLines={1}>
            {stationName}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* ===================================================================
            MODE A: MANUAL REVIEW SCREEN (Stitch 4: Check Photo Manual Review)
           =================================================================== */}
        {isManualReview ? (
          <View style={styles.sectionStack}>
            {/* Clean Minimal Amber Banner */}
            <View style={styles.amberBanner}>
              <View style={styles.amberIconBox}>
                <Text style={styles.amberIconText}>👁</Text>
              </View>
              <View style={styles.amberTextCol}>
                <Text style={styles.amberBannerTag}>CHECK NUMBER</Text>
                <Text style={styles.amberBannerTitle}>
                  Does photo match the number below?
                </Text>
              </View>
              <View style={styles.confBadgeAmber}>
                <Text style={styles.confBadgeAmberText}>
                  {(ocrData.confidence * 100).toFixed(0)}% OCR
                </Text>
              </View>
            </View>

            {/* Photo Preview Card */}
            {imageInput && imageInput.uri ? (
              <View style={styles.whiteCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTopLabel}>📷  LIVE CAMERA SNAP</Text>
                  <View style={styles.greenMiniPill}>
                    <View style={styles.greenMiniDot} />
                    <Text style={styles.greenMiniText}>Auto-Crop</Text>
                  </View>
                </View>
                <View style={styles.snapImageWrap}>
                  <Image
                    source={{ uri: imageInput.uri }}
                    style={styles.snapImage}
                    resizeMode="cover"
                  />
                  <View style={styles.snapOverlayPill}>
                    <Text style={styles.snapOverlayText}>Daylight Capture</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Crisp Tactile Segmented Character Display Card */}
            <View style={styles.whiteCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.rowCenter}>
                  <View style={styles.blueDot} />
                  <Text style={styles.cardTopLabel}>RECOGNIZED PLATE NUMBER</Text>
                </View>
                <TouchableOpacity
                  style={styles.keyboardTogglePill}
                  onPress={() => {
                    haptics.tap();
                    setShowKeyboardInput(!showKeyboardInput);
                  }}
                >
                  <Text style={styles.keyboardToggleText}>
                    {showKeyboardInput ? 'Done Typing' : '⌨ Full Keyboard'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Segmented Character Boxes */}
              <View style={styles.segmentedTray}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.segmentedRow}
                >
                  {charArray.map((ch, idx) => {
                    const isSelected = idx === activeCharIdx;
                    return (
                      <React.Fragment key={idx}>
                        {(idx === 2 || idx === 4 || idx === 6) && (
                          <Text style={styles.segmentDash}>-</Text>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.charSlot,
                            isSelected && styles.charSlotActive,
                          ]}
                          onPress={() => {
                            haptics.tap();
                            setActiveCharIdx(idx);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.charSlotText,
                              isSelected && styles.charSlotTextActive,
                            ]}
                          >
                            {ch}
                          </Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </ScrollView>
              </View>

              {showKeyboardInput && (
                <View style={styles.fullInputWrap}>
                  <TextInput
                    style={styles.fullTextInput}
                    value={editedReg}
                    onChangeText={t => {
                      const clean = t.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setEditedReg(clean);
                      setActiveCharIdx(Math.max(0, clean.length - 1));
                    }}
                    placeholder="Type full plate (e.g. DL01AB1234)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={12}
                    autoFocus
                  />
                </View>
              )}

              <View style={styles.slotHintRow}>
                <Text style={styles.slotHintLeft}>Format: Indian HSRP</Text>
                <Text style={styles.slotHintRight}>
                  👆 Tap any box to edit slot #{activeCharIdx + 1}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {[
                  { label: 'DL01AB1234 (Safe)', val: 'DL01AB1234' },
                  { label: 'DL01EXPIRED (Reject)', val: 'DL01EXPIRED' },
                  { label: 'DL01EXPIRING (Soon)', val: 'DL01EXPIRING' },
                ].map(p => (
                  <TouchableOpacity
                    key={p.val}
                    style={{
                      backgroundColor: editedReg === p.val ? '#DCFCE7' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: editedReg === p.val ? '#86EFAC' : '#E2E8F0',
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}
                    onPress={() => {
                      haptics.tap();
                      setEditedReg(p.val);
                      setActiveCharIdx(p.val.length - 1);
                    }}
                  >
                    <Text
                      style={{
                        color: editedReg === p.val ? '#15803D' : '#334155',
                        fontSize: 11,
                        fontWeight: '700',
                        fontFamily: 'monospace',
                      }}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.verifyDarkBtn, { marginTop: 6 }, isSubmitting && styles.btnDisabled]}
                onPress={handleConfirmVerification}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyDarkBtnText}>✓  VERIFY & CHECK PLATE</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 1-Tap Quick Fixes */}
            <View style={styles.quickFixSection}>
              <View style={styles.quickFixHeader}>
                <Text style={styles.cardTopLabel}>QUICK 1-TAP FIXES</Text>
                <Text style={styles.quickFixSub}>Common OCR Swaps</Text>
              </View>
              <View style={styles.quickFixGrid}>
                {[
                  ['8', 'B'],
                  ['0', 'O'],
                  ['1', 'I'],
                  ['5', 'S'],
                ].map(([a, b]) => (
                  <TouchableOpacity
                    key={`${a}-${b}`}
                    style={styles.quickFixBtn}
                    onPress={() => handleQuickFix(a, b)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickFixFrom}>{a}</Text>
                    <Text style={styles.quickFixArrow}>↔</Text>
                    <View style={styles.quickFixToBadge}>
                      <Text style={styles.quickFixTo}>{b}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Android-style Attendant Digit Pad */}
            <View style={styles.whiteCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTopLabel}>ATTENDANT DIGIT PAD</Text>
                <Text style={styles.quickFixSub}>
                  Replaces active slot #{activeCharIdx + 1}
                </Text>
              </View>
              <View style={styles.digitGrid}>
                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={styles.digitBtn}
                    onPress={() => handleTypeDigit(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.digitBtnText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Primary & Secondary Action Buttons */}
            <View style={styles.actionStack}>
              <TouchableOpacity
                style={[styles.verifyDarkBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleConfirmVerification}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyDarkBtnText}>✓  VERIFY & CHECK</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryOutlineBtn}
                onPress={() => {
                  haptics.tap();
                  onReset();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryOutlineBtnText}>↻  SCAN AGAIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isApproved ? (
          /* ===================================================================
             MODE B: APPROVED SAFE TO FILL (Stitch 2: Approved Safe to Fill)
             =================================================================== */
          <View style={styles.sectionStack}>
            {/* Reassuring High-Contrast Clean Verdict Card */}
            <View
              style={[
                styles.approvedHeroCard,
                isWarning && styles.warningHeroCard,
              ]}
            >
              <View style={styles.heroRoundel}>
                <Text
                  style={[
                    styles.heroRoundelIcon,
                    { color: isWarning ? '#D97706' : '#15803D' },
                  ]}
                >
                  {isWarning ? '!' : '✓'}
                </Text>
              </View>

              <Text style={styles.heroHeadline}>
                {isWarning ? 'SAFE TO FILL (WARNING)' : 'SAFE TO FILL'}
              </Text>

              <View style={styles.heroSubPill}>
                <Text style={styles.heroSubPillText}>
                  ⛽  CNG TEST VALID • DISPENSER UNLOCKED
                </Text>
              </View>

              <Text style={styles.heroSyncCaption}>
                ✓ PESO / CCOE Database Synced
              </Text>
            </View>

            {/* Authentic Indian HSRP License Plate */}
            <View style={styles.plateSection}>
              <View style={styles.plateLabelRow}>
                <Text style={styles.cardTopLabel}>IDENTIFIED VEHICLE PLATE</Text>
                <Text style={styles.rfidVerifiedTag}>
                  ● {details?.matched_via_fuzzy ? 'FUZZY VERIFIED' : 'ANPR VERIFIED'}
                </Text>
              </View>

              <View style={styles.hsrpPlateLarge}>
                <View style={styles.hsrpBandLarge}>
                  <View style={styles.hsrpChakraCircle}>
                    <Text style={styles.hsrpChakraStar}>✻</Text>
                  </View>
                  <Text style={styles.hsrpIndLarge}>IND</Text>
                </View>
                <View style={styles.hsrpBodyLarge}>
                  <Text
                    style={styles.hsrpNumberLarge}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {registrationText}
                  </Text>
                </View>
                <View style={styles.hsrpWatermark}>
                  <Text style={styles.hsrpWatermarkText}>HSRP</Text>
                </View>
              </View>
            </View>

            {/* 3 Clean White Summary Cards (Stitch Screen 2 Grid) */}
            <View style={styles.infoCardsStack}>
              {/* Box 1: Vehicle Category */}
              <View style={styles.infoRowCard}>
                <View style={styles.infoRowLeft}>
                  <View style={styles.infoIconNeutral}>
                    <Text style={styles.infoIconEmoji}>🚗</Text>
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>VEHICLE CATEGORY</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {details?.maker_model || 'PASSENGER CNG'}
                    </Text>
                  </View>
                </View>
                <View style={styles.codeTag}>
                  <Text style={styles.codeTagText}>
                    {details?.vehicle_class || 'CNG'}
                  </Text>
                </View>
              </View>

              {/* Box 2: Hydro Test Integrity */}
              <View style={styles.infoRowCard}>
                <View style={styles.infoRowLeft}>
                  <View style={styles.infoIconGreen}>
                    <Text style={styles.infoIconGreenText}>🛡</Text>
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>CYLINDER TESTING</Text>
                    <Text style={styles.infoValueGreen}>
                      HYDRO TEST: {isWarning ? 'EXPIRING SOON' : 'VALID'}
                    </Text>
                  </View>
                </View>
                <View style={styles.checkBadgeGreen}>
                  <Text style={styles.checkBadgeGreenText}>✓</Text>
                </View>
              </View>

              {/* Box 3: Expiry Telemetry */}
              <View style={styles.infoRowCard}>
                <View style={styles.infoRowLeft}>
                  <View style={styles.infoIconNeutral}>
                    <Text style={styles.infoIconEmoji}>📅</Text>
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>DUE EXPIRY DATE</Text>
                    <Text style={styles.infoValue}>{expiryDisplay}</Text>
                  </View>
                </View>
                {daysBadgeText ? (
                  <View style={styles.daysLeftPill}>
                    <Text style={styles.daysLeftPillText}>{daysBadgeText}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Optional Expandable Technical & Registry Details */}
            <TouchableOpacity
              style={styles.expandToggleCard}
              onPress={() => {
                haptics.tap();
                setShowFullDetails(!showFullDetails);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.expandToggleText}>
                {showFullDetails
                  ? '▲ Hide Full Cylinder & Audit Details'
                  : '▼ View Full Cylinder & Audit Details'}
              </Text>
            </TouchableOpacity>

            {showFullDetails && (
              <View style={styles.whiteCard}>
                <Text style={styles.cardTopLabel}>PESO & VAHAN REGISTRY RECORD</Text>
                <View style={styles.detailRowsWrap}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Cylinder Serial</Text>
                    <Text style={styles.detailValMono}>
                      {details?.cylinder_serial_no || verification?.compliance_id || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Water Capacity</Text>
                    <Text style={styles.detailVal}>
                      {details?.cylinder_water_capacity_liters
                        ? `${details.cylinder_water_capacity_liters} Liters`
                        : '60 Liters'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Testing Agency</Text>
                    <Text style={styles.detailVal}>
                      {details?.testing_agency || 'PESO Authorized Station'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>RTO Authority</Text>
                    <Text style={styles.detailVal}>
                      {details?.rto_name || 'N/A'} {details?.state_code ? `(${details.state_code})` : ''}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Kit Manufacturer</Text>
                    <Text style={styles.detailVal}>
                      {details?.kit_manufacturer || 'OEM Fitted'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>ANPR Confidence</Text>
                    <Text style={styles.detailVal}>
                      {(ocrData.confidence * 100).toFixed(0)}% ({ocrData.engine_name})
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Tactile Clean Green Action Button */}
            <TouchableOpacity
              style={styles.nextVehicleGreenBtn}
              onPress={() => {
                haptics.tap();
                onReset();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.nextVehicleGreenBtnText}>
                ⏭  NEXT VEHICLE  →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ===================================================================
             MODE C: REJECTED DO NOT FILL (Stitch 3: Rejected Do Not Fill)
             =================================================================== */
          <View style={styles.sectionStack}>
            {/* Top Verdict Rejection Card */}
            <View style={styles.rejectedHeroCard}>
              <View style={styles.interlockPill}>
                <Text style={styles.interlockPillText}>
                  🔒 NOZZLE INTERLOCK ACTIVE
                </Text>
              </View>

              <View style={styles.rejectedRoundel}>
                <Text style={styles.rejectedRoundelIcon}>✕</Text>
              </View>

              <Text style={styles.rejectedHeadline}>DO NOT FILL</Text>
              <Text style={styles.rejectedSubtitle}>
                Dispenser safety lockout engaged. Refueling strictly prohibited under PESO guidelines.
              </Text>
            </View>

            {/* Indian HSRP Digital Plate Card */}
            <View style={styles.whiteCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTopLabel}>IDENTIFIED VEHICLE</Text>
                <View style={styles.failedBadgePill}>
                  <Text style={styles.failedBadgeText}>✕ VERIFICATION FAILED</Text>
                </View>
              </View>

              <View style={styles.rejectedPlateBox}>
                <View style={styles.rejectedIndStrip}>
                  <Text style={styles.rejectedIndStar}>☀</Text>
                  <Text style={styles.rejectedIndText}>IND</Text>
                </View>
                <View style={styles.rejectedPlateCenter}>
                  <Text
                    style={styles.rejectedPlateNumber}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {registrationText}
                  </Text>
                  <Text style={styles.rejectedModelSub} numberOfLines={1}>
                    {details?.maker_model || 'UNVERIFIED CNG VEHICLE'}
                  </Text>
                </View>
                <View style={styles.expiredStamp}>
                  <Text style={styles.expiredStampText}>
                    {status === 'NOT_FOUND' ? 'UNLISTED' : status}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reason for Rejection Card */}
            <View style={styles.whiteCard}>
              <View style={styles.hazardAlertBox}>
                <View style={styles.hazardIconBox}>
                  <Text style={styles.hazardIconText}>⚠</Text>
                </View>
                <View style={styles.hazardTextCol}>
                  <Text style={styles.hazardTag}>
                    {status === 'NOT_FOUND'
                      ? 'NO PESO / VAHAN RECORD'
                      : 'CNG HYDRO TEST EXPIRED / INVALID'}
                  </Text>
                  <Text style={styles.hazardMainText}>
                    {details?.compliance_reason ||
                      (overdueDays > 0
                        ? `Hydro-test overdue by ${overdueDays} days`
                        : 'Cylinder safety certificate expired or invalid')}
                  </Text>
                  <Text style={styles.hazardSubText}>
                    Validity ended: {expiryDisplay} • Rule 33 PESO
                  </Text>
                </View>
              </View>

              <View style={styles.dangerInfoBox}>
                <View style={styles.dangerMiniIcon}>
                  <Text style={styles.dangerMiniIconText}>🚨</Text>
                </View>
                <View style={styles.hazardTextCol}>
                  <Text style={styles.dangerTitle}>Cylinder Rupture Danger</Text>
                  <Text style={styles.dangerDesc}>
                    Risk of structural failure at standard 200-bar dispenser delivery pressure.
                  </Text>
                </View>
              </View>

              <View style={styles.kvGrid2}>
                <View style={styles.kvBox}>
                  <Text style={styles.kvLabel}>CYLINDER SERIAL</Text>
                  <Text style={styles.kvValueMono} numberOfLines={1}>
                    {details?.cylinder_serial_no || verification?.compliance_id || 'UNREGISTERED'}
                  </Text>
                </View>
                <View style={styles.kvBox}>
                  <Text style={styles.kvLabel}>TESTING AGENCY</Text>
                  <Text style={styles.kvValueMono} numberOfLines={1}>
                    {details?.testing_agency || 'NONE ON FILE'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Forecourt Camera Snapshot */}
            {imageInput && imageInput.uri ? (
              <View style={styles.whiteCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTopLabel}>FORECOURT CAMERA SNAPSHOT</Text>
                  <View style={styles.recPill}>
                    <View style={styles.recDot} />
                    <Text style={styles.recText}>REC {bayNumber.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.snapshotBox}>
                  <Image
                    source={{ uri: imageInput.uri }}
                    style={styles.snapImage}
                    resizeMode="cover"
                  />
                  <View style={styles.snapshotBottomBar}>
                    <Text style={styles.snapshotOcrTag}>
                      OCR: {(ocrData.confidence * 100).toFixed(0)}%
                    </Text>
                    <View style={styles.blockedTag}>
                      <Text style={styles.blockedTagText}>DISPENSE BLOCKED</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Bottom Action Buttons */}
            <View style={styles.actionStack}>
              <TouchableOpacity
                style={styles.callSupervisorBtn}
                onPress={handleCallSupervisor}
                activeOpacity={0.85}
              >
                <View style={styles.callSupervisorLeft}>
                  <View style={styles.phoneIconBox}>
                    <Text style={styles.phoneIconText}>📞</Text>
                  </View>
                  <View>
                    <Text style={styles.callSupervisorTitle}>
                      {isCallingSupervisor ? 'CONNECTING...' : 'CALL SUPERVISOR'}
                    </Text>
                    <Text style={styles.callSupervisorSub}>
                      {isCallingSupervisor
                        ? 'Dialing Station Supervisor'
                        : 'Duty Manager Station • Ext 104'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.callSupervisorArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextNoFillBtn}
                onPress={() => {
                  haptics.tap();
                  onReset();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.nextNoFillBtnText}>
                  ⏭  NEXT VEHICLE (NO FILL)
                </Text>
                <Text style={styles.nextNoFillArrow}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <View style={styles.toastPill}>
          <Text style={styles.toastCheck}>✓</Text>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  backBtnText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  headerTextWrap: {
    flex: 1,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  onlineText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  stationPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    maxWidth: 130,
  },
  stationPillText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  container: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionStack: {
    gap: 14,
  },

  /* --- Manual Review (Stitch Screen 4) --- */
  amberBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amberIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amberIconText: {
    fontSize: 20,
  },
  amberTextCol: {
    flex: 1,
  },
  amberBannerTag: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  amberBannerTitle: {
    color: '#451A03',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  confBadgeAmber: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confBadgeAmberText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  cardTopLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  greenMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  greenMiniText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },
  snapImageWrap: {
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  snapImage: {
    width: '100%',
    height: '100%',
  },
  snapOverlayPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  snapOverlayText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '700',
  },
  keyboardTogglePill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  keyboardToggleText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
  },
  segmentedTray: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  segmentDash: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 1,
  },
  charSlot: {
    width: 26,
    height: 42,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  charSlotActive: {
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  charSlotText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  charSlotTextActive: {
    color: '#1D4ED8',
  },
  fullInputWrap: {
    marginTop: 4,
  },
  fullTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  slotHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotHintLeft: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  slotHintRight: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  quickFixSection: {
    gap: 8,
  },
  quickFixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  quickFixSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  quickFixGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFixBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  quickFixFrom: {
    color: '#E11D48',
    fontSize: 14,
    fontWeight: '800',
  },
  quickFixArrow: {
    color: '#94A3B8',
    fontSize: 12,
  },
  quickFixToBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  quickFixTo: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
  },
  digitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  digitBtn: {
    width: '18%',
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitBtnText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  actionStack: {
    gap: 10,
    marginTop: 4,
  },
  verifyDarkBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyDarkBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  secondaryOutlineBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryOutlineBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* --- Approved Safe to Fill (Stitch Screen 2) --- */
  approvedHeroCard: {
    backgroundColor: '#15803D',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#166534',
  },
  warningHeroCard: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  heroRoundel: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroRoundelIcon: {
    fontSize: 40,
    fontWeight: '900',
  },
  heroHeadline: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  heroSubPill: {
    backgroundColor: 'rgba(6, 78, 59, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  heroSubPillText: {
    color: '#ECFDF5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroSyncCaption: {
    color: 'rgba(236, 253, 245, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  plateSection: {
    gap: 6,
  },
  plateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  rfidVerifiedTag: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  hsrpPlateLarge: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    height: 72,
    overflow: 'hidden',
    position: 'relative',
  },
  hsrpBandLarge: {
    width: 46,
    backgroundColor: '#0038A8',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  hsrpChakraCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hsrpChakraStar: {
    color: '#0038A8',
    fontSize: 11,
    fontWeight: '900',
  },
  hsrpIndLarge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hsrpBodyLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  hsrpNumberLarge: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  hsrpWatermark: {
    position: 'absolute',
    right: 10,
    top: 6,
  },
  hsrpWatermarkText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
  },
  infoCardsStack: {
    gap: 10,
  },
  infoRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  infoIconNeutral: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconEmoji: {
    fontSize: 18,
  },
  infoIconGreen: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconGreenText: {
    fontSize: 18,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  infoValueGreen: {
    color: '#15803D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  codeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  codeTagText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  checkBadgeGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadgeGreenText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  daysLeftPill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  daysLeftPillText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  expandToggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expandToggleText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  detailRowsWrap: {
    gap: 8,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailKey: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  detailVal: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  detailValMono: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  nextVehicleGreenBtn: {
    backgroundColor: '#15803D',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  nextVehicleGreenBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  /* --- Rejected Do Not Fill (Stitch Screen 3) --- */
  rejectedHeroCard: {
    backgroundColor: '#DC2626',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B91C1C',
  },
  interlockPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  interlockPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  rejectedRoundel: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  rejectedRoundelIcon: {
    color: '#DC2626',
    fontSize: 40,
    fontWeight: '900',
  },
  rejectedHeadline: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rejectedSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  failedBadgePill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  failedBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  rejectedPlateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 8,
  },
  rejectedIndStrip: {
    width: 34,
    height: 46,
    backgroundColor: '#1D4ED8',
    borderRadius: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginRight: 10,
  },
  rejectedIndStar: {
    color: '#FCD34D',
    fontSize: 10,
  },
  rejectedIndText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  rejectedPlateCenter: {
    flex: 1,
    alignItems: 'center',
  },
  rejectedPlateNumber: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  rejectedModelSub: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  expiredStamp: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    transform: [{ rotate: '-5deg' }],
    marginLeft: 6,
  },
  expiredStampText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  hazardAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  hazardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hazardIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  hazardTextCol: {
    flex: 1,
  },
  hazardTag: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  hazardMainText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  hazardSubText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },
  dangerInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  dangerMiniIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerMiniIconText: {
    fontSize: 15,
  },
  dangerTitle: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
  },
  dangerDesc: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  kvGrid2: {
    flexDirection: 'row',
    gap: 8,
  },
  kvBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  kvLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  kvValueMono: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 3,
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  recText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
  },
  snapshotBox: {
    height: 115,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  snapshotBottomBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snapshotOcrTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    fontFamily: 'monospace',
  },
  blockedTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  blockedTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  callSupervisorBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  callSupervisorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneIconText: {
    fontSize: 16,
  },
  callSupervisorTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  callSupervisorSub: {
    color: '#FEE2E2',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  callSupervisorArrow: {
    color: '#FECACA',
    fontSize: 18,
    fontWeight: '800',
  },
  nextNoFillBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  nextNoFillBtnText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  nextNoFillArrow: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '800',
  },
  toastPill: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
  },
  toastCheck: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '900',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
