import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { AppImage as Image } from '../../components/AppImage';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { uploadRiderDocumentPhoto } from '../../api/onboarding';
import { compressImageToTarget } from '../../media/compressImage';
import { useAuthStore } from '../../store/useAuthStore';
import type { RiderProfile } from '../../api/profile';

type Changes = { aadhaarPhotoPath?: string; licencePhotoPath?: string; licenceNumber?: string;
  vehicleType?: 'bicycle' | 'scooter' | 'motorcycle'; vehicleNumber?: string };
interface LatestRequest { id: string; status: 'pending' | 'approved' | 'rejected'; review_note: string | null }
export function RiderProfileChangeForm({ profile }: { profile: RiderProfile }) {
  const phone = useAuthStore((state) => state.phone);
  const queryClient = useQueryClient();
  const requestKey = ['rider-profile-changes', phone];
  const { data: request, isLoading, isError, refetch } = useQuery({ queryKey: requestKey,
    queryFn: () => apiRequest<LatestRequest | null>('/rider/profile-changes'), staleTime: 30_000 });
  useEffect(() => {
    if (request?.status === 'approved') void queryClient.invalidateQueries({ queryKey: ['riderProfile', phone] });
  }, [request?.id, request?.status, phone, queryClient]);
  const [editing, setEditing] = useState(false);
  const [changes, setChanges] = useState<Changes>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const currentAccount = () => mounted.current && useAuthStore.getState().phone === phone;
  async function upload(kind: 'aadhaar' | 'dl') {
    if (locked.current || !currentAccount()) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!currentAccount()) return;
      if (!permission.granted) { Alert.alert('Photo access required', 'Allow photo access to choose your document.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: true });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.base64 || !currentAccount()) return;
      const photo = await compressImageToTarget(asset.uri, asset.base64);
      if (!currentAccount()) return;
      const uploaded = await uploadRiderDocumentPhoto(photo.base64, kind);
      if (!currentAccount()) return;
      setChanges((old) => ({ ...old, [kind === 'aadhaar' ? 'aadhaarPhotoPath' : 'licencePhotoPath']: uploaded.path }));
      setPreviews((old) => ({ ...old, [kind]: asset.uri }));
    } catch (err) { if (currentAccount()) setError(err instanceof Error ? err.message : 'Could not upload your document.'); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  async function submit() {
    if (locked.current || !currentAccount() || request?.status === 'pending') return;
    locked.current = true; setBusy(true); setError(null);
    try {
      await apiRequest('/rider/profile-changes', { method: 'POST', body: changes });
      if (!currentAccount()) return;
      await queryClient.invalidateQueries({ queryKey: requestKey });
      if (!currentAccount()) return;
      setChanges({}); setPreviews({}); setEditing(false);
    } catch (err) { if (currentAccount()) setError(err instanceof Error ? err.message : 'Could not submit changes.'); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  return <View className="gap-3 rounded-2xl border border-black/10 bg-white p-4">
    <Text className="text-base font-semibold text-ink">Update documents or vehicle</Text>
    <Text className="text-sm text-ink/60">Your approved details stay in use until our team reviews your changes.</Text>
    {request && <Text className="text-sm font-medium text-ink">{request.status === 'pending' ? 'Changes awaiting review' :
      request.status === 'approved' ? 'Your last changes were approved' : `Changes need attention: ${request.review_note ?? 'Please submit again.'}`}</Text>}
    {isError && <Pressable onPress={() => void refetch()}><Text className="text-sm text-red-600">Could not check review status. Tap to retry.</Text></Pressable>}
    {error && <Text accessibilityRole="alert" className="text-sm text-red-600">{error}</Text>}
    {request?.status !== 'pending' && !isLoading && !isError && <Pressable disabled={busy} onPress={() => setEditing(!editing)}>
      <Text className="font-semibold text-blue-600">{editing ? 'Close editor' : 'Request an update'}</Text></Pressable>}
    {editing && request?.status !== 'pending' && <>
      {(['aadhaar', 'dl'] as const).map((kind) => <View key={kind} className="gap-2">
        <Pressable disabled={busy} onPress={() => void upload(kind)} className="rounded-xl bg-gray-100 p-3">
          <Text className="font-medium text-ink">{kind === 'aadhaar' ? 'Replace Aadhaar scan' : 'Replace driving licence scan'}</Text></Pressable>
        {previews[kind] && <Image source={{ uri: previews[kind] }} className="h-32 w-full rounded-xl" resizeMode="contain" />}
      </View>)}
      <TextInput editable={!busy} value={changes.licenceNumber ?? profile.dlNumber ?? ''} maxLength={30}
        onChangeText={(licenceNumber) => setChanges((old) => ({ ...old, licenceNumber }))} placeholder="Driving licence number"
        className="rounded-xl border border-black/10 p-3 text-ink" />
      <View className="flex-row gap-2">{(['bicycle', 'scooter', 'motorcycle'] as const).map((type) =>
        <Pressable key={type} disabled={busy} onPress={() => setChanges((old) => ({ ...old, vehicleType: type,
          vehicleNumber: type === 'bicycle' ? '' : old.vehicleNumber ?? profile.vehicleNumber ?? '' }))}
          className={`flex-1 rounded-xl p-2 ${(changes.vehicleType ?? profile.vehicleType) === type ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Text className="text-center text-xs font-medium text-ink">{type === 'motorcycle' ? 'Motorcycle' : type === 'scooter' ? 'Scooter' : 'Bicycle'}</Text>
        </Pressable>)}</View>
      {(changes.vehicleType ?? profile.vehicleType) !== 'bicycle' && <TextInput editable={!busy}
        value={changes.vehicleNumber ?? profile.vehicleNumber ?? ''} maxLength={20} autoCapitalize="characters"
        onChangeText={(vehicleNumber) => setChanges((old) => ({ ...old, vehicleNumber }))} placeholder="Vehicle registration"
        className="rounded-xl border border-black/10 p-3 text-ink" />}
      <Pressable disabled={busy || !Object.keys(changes).length} onPress={() => void submit()} className="rounded-xl bg-blue-600 p-3">
        <Text className="text-center font-semibold text-white">{busy ? 'Saving your changes…' : 'Submit for review'}</Text></Pressable>
    </>}
  </View>;
}
