import CryptoJS from 'crypto-js';

/**
 * Convert ArrayBuffer to CryptoJS WordArray
 */
function arrayBufferToWordArray(ab: ArrayBuffer): CryptoJS.lib.WordArray {
  const i8a = new Uint8Array(ab);
  const words: number[] = [];
  for (let i = 0; i < i8a.length; i += 4) {
    words.push(
      (i8a[i] << 24) |
      ((i8a[i + 1] || 0) << 16) |
      ((i8a[i + 2] || 0) << 8) |
      (i8a[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, i8a.length);
}

/**
 * Compute SHA-256 hash string (lowercase hex) for given binary ArrayBuffer.
 */
export function computeSha256(arrayBuffer: ArrayBuffer): string {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return '';
  }
  const wordArray = arrayBufferToWordArray(arrayBuffer);
  return CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
}
