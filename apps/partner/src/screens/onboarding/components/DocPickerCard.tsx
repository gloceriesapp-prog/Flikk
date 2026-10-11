// Reusable "add a private document photo" card for the onboarding wizard —
// store photo, owner profile photo, Aadhaar. Visual twin of PayoutAccountCard's
// cheque/passbook proof row: dashed-border placeholder when empty, success tint
// once a path exists, a spinner while the upload is in flight. These are
// encrypted private documents, so there's no image preview here — only an
// "added" state (a path string, never a URL) — same as the payout proof row.

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CheckmarkCircle02Icon, ImageUpload01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  label: string;
  hint?: string;
  // Whether a path is already set — drives the "Change" vs "Add photo" copy.
  hasPhoto: boolean;
  uploading: boolean;
  onPick: () => void;
  error?: string | null;
}

export function DocPickerCard({ label, hint, hasPhoto, uploading, onPick, error }: Props) {
  return (
    <View className="gap-2.5">
      <Text className="text-[15px] font-semibold text-ink/80">{label}</Text>
      <Pressable
        onPress={onPick}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={hasPhoto ? `Change ${label}` : `Add ${label}`}
        className={`flex-row items-center gap-3 rounded-2xl px-4 py-3.5 ${
          hasPhoto ? 'bg-success/10' : 'border border-dashed border-black/15 bg-[#F9FAFB]'
        }`}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <AppIcon
            icon={hasPhoto ? CheckmarkCircle02Icon : ImageUpload01Icon}
            size={20}
            color={hasPhoto ? colors.success : colors.primary}
          />
        )}
        <Text className="flex-1 text-[13px] font-semibold text-ink/80">
          {uploading ? 'Uploading…' : hasPhoto ? 'Photo added — tap to change' : 'Add photo'}
        </Text>
      </Pressable>
      {hint && !error && <Text className="text-[12px] font-medium text-ink/40">{hint}</Text>}
      {error && <Text className="text-[12px] font-medium text-danger">{error}</Text>}
    </View>
  );
}
