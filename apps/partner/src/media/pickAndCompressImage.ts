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

  // No base64 from the picker — compressImageToTarget resizes first and
  // produces base64 only from the small image (its own note on why eagerly
  // materializing a 12MP shot's base64 froze the UI).
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.uri) return null;

  const compressed = await compressImageToTarget(asset.uri, asset.width);
  // Only the original (un-recompressed) pass keeps the source mime type;
  // every compress pass re-encodes to JPEG (see compressImage.ts).
  const contentType = compressed.uri === asset.uri ? (asset.mimeType ?? 'image/jpeg') : 'image/jpeg';
  return { base64: compressed.base64, contentType };
}
