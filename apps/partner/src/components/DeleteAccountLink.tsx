// "Delete my account" for screens outside the main app shell: applications
// under review or rejected, and suspended partners, never reach Store
// settings, but Play requires every account to be deletable from inside the
// app. Picks the endpoint by role (see api/accountDeletion.ts) and reports
// the outcome in an alert.

import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { ApiError } from '../api/client';
import { requestDeletionForCurrentAccount } from '../api/accountDeletion';

export function DeleteAccountLink() {
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await requestDeletionForCurrentAccount();
      Alert.alert('Request received', 'Our team will verify it and delete your account and personal data within 30 days.');
    } catch (error) {
      Alert.alert('Request not sent', error instanceof ApiError ? error.message : 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const confirm = () =>
    Alert.alert(
      'Delete your account?',
      'We will delete your partner account, store application and personal data. Records the law requires us to keep are retained only as long as required.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request deletion', style: 'destructive', onPress: () => void send() },
      ],
    );

  return (
    <Pressable onPress={confirm} disabled={sending} hitSlop={8} accessibilityRole="button">
      <Text className="text-sm font-semibold text-danger">{sending ? 'Sending request…' : 'Delete my account'}</Text>
    </Pressable>
  );
}
