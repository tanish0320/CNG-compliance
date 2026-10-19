import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import { ImageInput } from '../types/compliance';

interface Props {
  statusText: string;
  imageInput: ImageInput | null;
}

export function ProcessingView({ statusText, imageInput }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color="#15803D" />
        </View>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>STEP 2 OF 2 • VERIFYING</Text>
        </View>
        <Text style={styles.title}>Checking CNG Compliance</Text>
        <Text style={styles.statusText}>{statusText}</Text>

        {imageInput && imageInput.uri ? (
          <View style={styles.imageInfoContainer}>
            <Image source={{ uri: imageInput.uri }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.metaContainer}>
              <Text style={styles.metaTitle}>Plate Snapshot Captured</Text>
              <Text style={styles.metaText}>Source: {imageInput.source}</Text>
              <Text style={styles.metaBadge}>PESO / VAHAN Live Lookup</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 6,
  },
  spinnerWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  stepPillText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  statusText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  imageInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  metaContainer: {
    marginLeft: 12,
    flex: 1,
  },
  metaTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  metaText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  metaBadge: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
