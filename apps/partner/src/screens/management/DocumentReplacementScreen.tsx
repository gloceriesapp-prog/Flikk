import { useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { managementApi } from '../../api/management';
import { getSessionEpoch, isCurrentSession } from '../../store/sessionScope';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import type { AppStackParamList } from '../../navigation/types';
import { ManagementPage, ManagementButton, failureMessage } from './ManagementPage';

const documents = [
  ['pan_number', 'PAN'],
  ['gst_number', 'GST'],
  ['fssai_number', 'FSSAI'],
  ['shop_establishment_number', 'Shop & Establishment'],
] as const;

export function DocumentReplacementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [field, setField] = useState<string>('pan_number');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function submit() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    const epoch = getSessionEpoch();
    try {
      const result = await managementApi.replace(field, value);
      if (!isCurrentSession(epoch)) return;
      void useStoreProfileStore.getState().loadProfile();
      Alert.alert(
        result.pendingReview ? 'Sent for admin review' : 'Already up to date',
        result.pendingReview ? 'Your approved document number stays unchanged until Gloceries approves this replacement.' : 'The number matches your current document.',
      );
      navigation.goBack();
    } catch (error) {
      if (isCurrentSession(epoch)) Alert.alert('Request not saved', failureMessage(error));
    } finally {
      busy.current = false;
      if (isCurrentSession(epoch)) setSaving(false);
    }
  }

  return (
    <ManagementPage title="Replace a legal document">
      <Text>Your current approved details remain active during review. You can see the decision in Store settings.</Text>
      <View className="gap-2">
        {documents.map(([key, label]) => (
          <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: key === field, disabled: saving }} disabled={saving}
            onPress={() => { setField(key); setValue(''); }} className="rounded-xl bg-white p-3">
            <Text className="font-semibold">{key === field ? '● ' : '○ '}{label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput accessibilityLabel="Replacement document number" editable={!saving} autoCapitalize="characters" autoCorrect={false}
        maxLength={100} value={value} onChangeText={setValue} placeholder="New document number" className="rounded-xl bg-white p-4" />
      <ManagementButton disabled={saving || !value.trim()} label={saving ? 'Submitting…' : 'Send for review'} onPress={() => void submit()} />
      <Text>To replace a private document photo, contact support. Never upload identity documents as public store photos.</Text>
      <ManagementButton label="Private document support" onPress={() => navigation.navigate('Support', { compose: true })} />
    </ManagementPage>
  );
}
