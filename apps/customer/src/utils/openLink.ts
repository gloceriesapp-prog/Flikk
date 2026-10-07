import { Alert, Linking } from 'react-native';

// Opens an admin-configured URL (legal pages, tel:, mailto:, wa.me) with a
// visible failure instead of a silent no-op when no app can handle it.
export function openLink(url: string): void {
  Linking.openURL(url).catch(() => Alert.alert('Could not open link', 'Please try again later.'));
}
