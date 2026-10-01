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
        <ActivityIndicator size="large" color="#38bdf8" style={styles.spinner} />
        <Text style={styles.title}>PROCESSING VEHICLE IMAGE</Text>
        <Text style={styles.statusText}>{statusText}</Text>

        {imageInput && (
          <View style={styles.imageInfoContainer}>
            {imageInput.uri ? (
              <Image source={{ uri: imageInput.uri }} style={styles.thumb} resizeMode="cover" />
            ) : null}
            <View style={styles.metaContainer}>
              <Text style={styles.metaText}>Source: {imageInput.source}</Text>
              <Text style={styles.metaText}>
                Size: {(imageInput.size / 1024).toFixed(1)} KB
              </Text>
              <Text style={styles.metaText}>
                SHA-256: {imageInput.sha256 ? `${imageInput.sha256.substring(0, 16)}...` : 'Calculating...'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#38bdf8',
    elevation: 8,
  },
  spinner: {
    marginBottom: 16,
  },
  title: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  imageInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metaContainer: {
    marginLeft: 12,
    flex: 1,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 2,
  },
});
