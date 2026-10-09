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
} from 'react-native';
import { ScanHistoryItem } from '../utils/history';
import { ComplianceStatus } from '../types/compliance';
import { haptics } from '../utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  history: ScanHistoryItem[];
  onClear: () => void;
  onSelectScan?: (item: ScanHistoryItem) => void;
}

type FilterCategory = 'ALL' | 'VALID' | 'EXPIRED' | 'MANUAL';

const STATUS_PILLS: Record<ComplianceStatus, { label: string; bg: string; text: string }> = {
  VALID: { label: 'VALID', bg: '#064e3b', text: '#34d399' },
  EXPIRING_SOON: { label: 'EXPIRING', bg: '#78350f', text: '#fbbf24' },
  EXPIRED: { label: 'EXPIRED', bg: '#7f1d1d', text: '#f87171' },
  INVALID: { label: 'INVALID', bg: '#7f1d1d', text: '#f87171' },
  NOT_FOUND: { label: 'NOT FOUND', bg: '#334155', text: '#cbd5e1' },
  MANUAL_REVIEW: { label: 'MANUAL', bg: '#581c87', text: '#c084fc' },
  PROVIDER_UNAVAILABLE: { label: 'OFFLINE', bg: '#7c2d12', text: '#fb923c' },
};

export function ShiftHistoryModal({ visible, onClose, history, onClear, onSelectScan }: Props) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');

  const compliantCount = history.filter(h => h.status === 'VALID').length;
  const expiredCount = history.filter(h => h.status === 'EXPIRED' || h.status === 'INVALID').length;
  const manualCount = history.filter(h => h.status === 'MANUAL_REVIEW').length;

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Category filter
      if (activeFilter === 'VALID' && item.status !== 'VALID') return false;
      if (activeFilter === 'EXPIRED' && item.status !== 'EXPIRED' && item.status !== 'INVALID') return false;
      if (activeFilter === 'MANUAL' && item.status !== 'MANUAL_REVIEW') return false;

      // Text search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toUpperCase();
        return item.registration.toUpperCase().includes(query);
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
    const pill = STATUS_PILLS[item.status] || STATUS_PILLS.MANUAL_REVIEW;
    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => {
          haptics.tap();
          if (onSelectScan) onSelectScan(item);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.historyCardLeft}>
          <Text style={styles.plateText}>{item.registration || 'UNREADABLE'}</Text>
          <Text style={styles.metaText}>
            {item.timestamp} | {item.source} | {(item.confidence * 100).toFixed(0)}% CONF
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.statusPillText, { color: pill.text }]}>{pill.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>SHIFT ACTIVITY LOG</Text>
            <Text style={styles.subtitle}>Recent Dispenser Scans & Audits</Text>
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

        {/* Stats Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#34d399' }]}>{compliantCount}</Text>
            <Text style={styles.statLabel}>Compliant</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#f87171' }]}>{expiredCount}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#c084fc' }]}>{manualCount}</Text>
            <Text style={styles.statLabel}>Manual</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#38bdf8' }]}>{history.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Search Bar & Filter Chips */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search license plate (e.g. DL01)"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={styles.filterChipsRow}>
            {(['ALL', 'VALID', 'EXPIRED', 'MANUAL'] as FilterCategory[]).map(cat => {
              const isActive = activeFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => {
                    haptics.tap();
                    setActiveFilter(cat);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Vehicle List */}
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>NO MATCHING ENTRIES</Text>
            </View>
            <Text style={styles.emptyText}>No records match current filter or search criteria.</Text>
            <Text style={styles.emptySubtext}>Scanned vehicles are recorded automatically.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Footer Actions */}
        {history.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleClearWithConfirm} style={styles.clearBtn} activeOpacity={0.8}>
              <Text style={styles.clearBtnText}>CLEAR SHIFT LOG</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeBtnText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  searchInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: '#38bdf8',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  historyCardLeft: {
    flex: 1,
  },
  plateText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  metaText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyBox: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyBoxText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  clearBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  clearBtnText: {
    color: '#f87171',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
