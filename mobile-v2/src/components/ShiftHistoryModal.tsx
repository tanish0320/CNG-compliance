import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { ScanHistoryItem } from '../utils/history';
import { ComplianceStatus } from '../types/compliance';
import { haptics } from '../utils/haptics';

const ANDROID_TOP_INSET =
  Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 38) : 0;
const ANDROID_BOTTOM_INSET = Platform.OS === 'android' ? 22 : 0;

interface Props {
  visible: boolean;
  onClose: () => void;
  history: ScanHistoryItem[];
  onClear: () => void;
  onSelectScan?: (item: ScanHistoryItem) => void;
  onStartNewScan?: () => void;
  stationName?: string;
  bayNumber?: string;
  inline?: boolean;
}


type FilterCategory = 'ALL' | 'VALID' | 'EXPIRED' | 'MANUAL';

interface StatusStyle {
  bannerTitle: string;
  bannerSub: string;
  bg: string;
  border: string;
  text: string;
  subText: string;
  icon: string;
  iconColor: string;
}

const STATUS_STYLES: Record<ComplianceStatus, StatusStyle> = {
  VALID: {
    bannerTitle: 'FILLED — SAFE',
    bannerSub: 'Hydro Test Valid',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#064E3B',
    subText: '#047857',
    icon: '✓',
    iconColor: '#16A34A',
  },
  EXPIRING_SOON: {
    bannerTitle: 'SAFE — EXPIRING SOON',
    bannerSub: 'Due < 30 Days',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#78350F',
    subText: '#B45309',
    icon: '!',
    iconColor: '#D97706',
  },
  EXPIRED: {
    bannerTitle: 'REJECTED — EXPIRED',
    bannerSub: 'Fuel Lockout',
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#881337',
    subText: '#BE123C',
    icon: '✕',
    iconColor: '#E11D48',
  },
  INVALID: {
    bannerTitle: 'REJECTED — INVALID',
    bannerSub: 'PESO Blocked',
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#881337',
    subText: '#BE123C',
    icon: '✕',
    iconColor: '#E11D48',
  },
  NOT_FOUND: {
    bannerTitle: 'REJECTED — UNREGISTERED',
    bannerSub: 'No VAHAN Record',
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#881337',
    subText: '#BE123C',
    icon: '✕',
    iconColor: '#E11D48',
  },
  MANUAL_REVIEW: {
    bannerTitle: 'MANUAL — REVIEWED',
    bannerSub: 'Attendant Check',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#78350F',
    subText: '#B45309',
    icon: '?',
    iconColor: '#D97706',
  },
  PROVIDER_UNAVAILABLE: {
    bannerTitle: 'OFFLINE — UNVERIFIED',
    bannerSub: 'Sync Pending',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    text: '#334155',
    subText: '#64748B',
    icon: '!',
    iconColor: '#64748B',
  },
};

export function ShiftHistoryModal({
  visible,
  onClose,
  history,
  onClear,
  onSelectScan,
  onStartNewScan,
  stationName = 'GAIL Gas Sector 22',
  bayNumber = 'Bay 02',
  inline = false,
}: Props) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');

  const safeCount = history.filter(
    h => h.status === 'VALID' || h.status === 'EXPIRING_SOON'
  ).length;
  const rejectedCount = history.filter(
    h => h.status === 'EXPIRED' || h.status === 'INVALID' || h.status === 'NOT_FOUND'
  ).length;
  const manualCount = history.filter(h => h.status === 'MANUAL_REVIEW').length;

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (
        activeFilter === 'VALID' &&
        item.status !== 'VALID' &&
        item.status !== 'EXPIRING_SOON'
      ) {
        return false;
      }
      if (
        activeFilter === 'EXPIRED' &&
        item.status !== 'EXPIRED' &&
        item.status !== 'INVALID' &&
        item.status !== 'NOT_FOUND'
      ) {
        return false;
      }
      if (activeFilter === 'MANUAL' && item.status !== 'MANUAL_REVIEW') {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toUpperCase().replace(/\s+/g, '');
        const cleanReg = (item.registration || '').toUpperCase().replace(/\s+/g, '');
        return cleanReg.includes(query);
      }
      return true;
    });
  }, [history, activeFilter, searchQuery]);

  const handleClearWithConfirm = () => {
    haptics.tap();
    Alert.alert(
      'Clear Shift Activity Log',
      'Are you sure you want to clear all scans recorded for this shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Log',
          style: 'destructive',
          onPress: () => {
            haptics.warning();
            onClear();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ScanHistoryItem }) => {
    const st = STATUS_STYLES[item.status] || STATUS_STYLES.MANUAL_REVIEW;
    return (
      <TouchableOpacity
        style={styles.scanCard}
        onPress={() => {
          haptics.tap();
          if (onSelectScan) onSelectScan(item);
        }}
        activeOpacity={0.85}
      >
        {/* Top Meta Row */}
        <View style={styles.scanCardTopRow}>
          <View style={styles.timeRow}>
            <View style={[styles.timeDot, { backgroundColor: st.iconColor }]} />
            <Text style={styles.timeText}>{item.timestamp}</Text>
          </View>
          <Text style={styles.pumpText}>
            {item.source} • {(item.confidence * 100).toFixed(0)}% OCR
          </Text>
        </View>

        {/* Authentic Indian HSRP Plate Graphic */}
        <View style={styles.hsrpBox}>
          <View style={styles.hsrpBlueBand}>
            <View style={styles.hsrpChakraDot} />
            <Text style={styles.hsrpIndLabel}>IND</Text>
          </View>
          <View style={styles.hsrpPlateBody}>
            <Text style={styles.hsrpPlateNumber} numberOfLines={1}>
              {item.registration || 'UNREADABLE'}
            </Text>
            <View style={[styles.hsrpBadgeCircle, { backgroundColor: st.bg, borderColor: st.border }]}>
              <Text style={[styles.hsrpBadgeIcon, { color: st.iconColor }]}>{st.icon}</Text>
            </View>
          </View>
        </View>

        {/* Status Banner Pill */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: st.bg, borderColor: st.border },
          ]}
        >
          <View style={styles.statusBannerLeft}>
            <View style={[styles.statusIconCircle, { backgroundColor: st.iconColor }]}>
              <Text style={styles.statusIconText}>{st.icon}</Text>
            </View>
            <Text style={[styles.statusBannerTitle, { color: st.text }]}>
              {st.bannerTitle}
            </Text>
          </View>
          <Text style={[styles.statusBannerSub, { color: st.subText }]}>
            {st.bannerSub}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const innerContent = (
    <SafeAreaView style={styles.container}>
      {/* Minimalist Light Top Header */}
      <View style={[styles.header, !inline && { paddingTop: 12 + ANDROID_TOP_INSET }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              haptics.tap();
              onClose();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineLabel}>ONLINE • ACTIVE</Text>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Shift Logs</Text>
              <Text style={styles.titleDot}>•</Text>
              <Text style={styles.stationText} numberOfLines={1}>
                {stationName}
              </Text>
            </View>
          </View>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            onPress={handleClearWithConfirm}
            style={styles.clearHeaderBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.clearHeaderBtnText}>CLEAR</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.contentWrapper}>
        {/* Shift Summary Card (Daylight High-Readability) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryTitle}>
              MY SHIFT: {history.length} {history.length === 1 ? 'VEHICLE' : 'VEHICLES'}
            </Text>
            <View style={styles.laneBadge}>
              <Text style={styles.laneBadgeText}>{bayNumber}</Text>
            </View>
          </View>

          <View style={styles.chipsGrid}>
            {/* Safe Chip */}
            <View style={[styles.summaryChip, styles.safeChip]}>
              <Text style={styles.safeChipCount}>{safeCount}</Text>
              <Text style={styles.safeChipLabel}>✓ SAFE</Text>
            </View>

            {/* Rejected Chip */}
            <View style={[styles.summaryChip, styles.rejectedChip]}>
              <Text style={styles.rejectedChipCount}>{rejectedCount}</Text>
              <Text style={styles.rejectedChipLabel}>✕ REJECTED</Text>
            </View>

            {/* Reviewed Chip */}
            <View style={[styles.summaryChip, styles.reviewedChip]}>
              <Text style={styles.reviewedChipCount}>{manualCount}</Text>
              <Text style={styles.reviewedChipLabel}>? REVIEWED</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search plate number..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tactile Filter Pills */}
        <View style={styles.filterPillsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            {[
              { key: 'ALL' as FilterCategory, label: `All (${history.length})` },
              { key: 'VALID' as FilterCategory, label: '✓ Safe' },
              { key: 'EXPIRED' as FilterCategory, label: '✕ Rejected' },
              { key: 'MANUAL' as FilterCategory, label: '? Manual' },
            ].map(f => {
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => {
                    haptics.tap();
                    setActiveFilter(f.key);
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Shift Log Entries List */}
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconText}>🔍</Text>
            </View>
            <Text style={styles.emptyTitle}>No matching scans found</Text>
            <Text style={styles.emptySubtitle}>
              {history.length === 0
                ? 'Scan a vehicle number plate to start logging your shift.'
                : 'Try searching with different plate digits or clear filters.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Clean Bottom CTA Button */}
      <View
        style={[
          styles.footerBar,
          !inline && { paddingBottom: 12 + ANDROID_BOTTOM_INSET },
        ]}
      >
        <TouchableOpacity
          style={styles.newScanBtn}
          onPress={() => {
            haptics.tap();
            onClose();
            if (onStartNewScan) onStartNewScan();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.newScanBtnText}>📷  NEW SCAN (CAMERA)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (inline) {
    if (!visible) return null;
    return innerContent;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      {innerContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
    gap: 12,
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
  headerTitles: {
    flex: 1,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  onlineLabel: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  title: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  titleDot: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  stationText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  clearHeaderBtn: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearHeaderBtnText: {
    color: '#E11D48',
    fontSize: 11,
    fontWeight: '800',
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  laneBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  laneBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chipsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  safeChip: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  safeChipCount: {
    color: '#065F46',
    fontSize: 20,
    fontWeight: '900',
  },
  safeChipLabel: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  rejectedChip: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  rejectedChipCount: {
    color: '#9F1239',
    fontSize: 20,
    fontWeight: '900',
  },
  rejectedChipLabel: {
    color: '#BE123C',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  reviewedChip: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  reviewedChipCount: {
    color: '#92400E',
    fontSize: 20,
    fontWeight: '900',
  },
  reviewedChipLabel: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 11,
    paddingRight: 40,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  filterPillsWrap: {
    marginBottom: 12,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterPillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
    gap: 10,
  },
  scanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 10,
  },
  scanCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  timeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  pumpText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hsrpBox: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderRadius: 10,
    overflow: 'hidden',
    height: 50,
  },
  hsrpBlueBand: {
    backgroundColor: '#003893',
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  hsrpChakraDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
    marginBottom: 2,
  },
  hsrpIndLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  hsrpPlateBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  hsrpPlateNumber: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  hsrpBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hsrpBadgeIcon: {
    fontSize: 13,
    fontWeight: '900',
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  statusBannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  statusBannerSub: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIconText: {
    fontSize: 20,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  footerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  newScanBtn: {
    backgroundColor: '#16A34A',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newScanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
