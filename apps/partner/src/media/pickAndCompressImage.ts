// One place for the permission → launchImageLibraryAsync → compress → base64
// boilerplate that StoreSettingsScreen / AddProductScreen / PayoutAccountCard
// each hand-rolled. Returns the compressed base64 + a content type ready to
// POST, or null when the user denied access, cancelled, or the asset had no
// base64 — callers just early-return on null.

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { compressImageToTarget } from './compressImage';

export interface PickedImage {
  base64: string;
  contentType: string;
}

export async function pickAndCompressImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo access to add this photo.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: true });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.base64) return null;

  const compressed = await compressImageToTarget(asset.uri, asset.base64);
  // Only the original (un-recompressed) pass keeps the source mime type;
  // every compress pass re-encodes to JPEG (see compressImage.ts).
  const contentType = compressed.uri === asset.uri ? (asset.mimeType ?? 'image/jpeg') : 'image/jpeg';
  return { base64: compressed.base64, contentType };
}
