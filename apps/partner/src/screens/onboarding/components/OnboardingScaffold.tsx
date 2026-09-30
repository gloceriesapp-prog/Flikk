// Shared chrome for the partner onboarding wizard's form steps (Store
// details, Location, Owner, Documents, Hours) — one place for the top bar
// (back arrow + segmented step progress), the title + subheading, the
// scrolling keyboard-aware body, and the pinned footer button, so the
// form screens don't each re-implement the same layout. Ported from
// apps/rider's own OnboardingScaffold so both apps' wizards read the same.
//
// Top bar is a back arrow on the left and a centered N-segment progress
// bar (WizardProgress) — no "Step X of Y" text. Segments up to and
// including the current step are filled ink, the rest are faint: reads as
// "how far along" at a glance.

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { DismissKeyboardView } from '../../../components/DismissKeyboardView';
import { colors } from '../../../theme/tokens';

// Pure white onboarding surface — no grey page tint. Fields define
// themselves with a faint fill instead of sitting on raised white cards,
// which reads cleaner/more premium on a flat white page.
export const PAGE_BG = '#FFFFFF';

// Faint-fill flat input — no border, no white-on-white card. Same class
// apps/rider's own wizard inputs use, so the two flows look identical.
export const INPUT_CLASS = 'rounded-2xl bg-[#EEF0F2] px-5 py-4 text-[15px] font-medium text-ink';

// Every screen in the wizard's progress bar counts against the same total —
// StoreDetails(1) → StoreLocation(2) → OwnerDetails(3) → BusinessDocuments(4)
// → StoreHours(5) → Review.
export const WIZARD_TOTAL_STEPS = 5;

interface Props {
  // 1-based position in the wizard; drives the progress bar. Omit on a
  // screen that isn't a numbered step.
  step?: number;
  totalSteps?: number;
  title: string;
  subheading: string;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function OnboardingScaffold({ step, totalSteps = WIZARD_TOTAL_STEPS, title, subheading, onBack, children, footer }: Props) {
  const showTopBar = !!onBack || step !== undefined;

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: PAGE_BG }}>
        {/* Dark status-bar icons for the white onboarding surface. */}
        <StatusBar style="dark" />
        {showTopBar && (
          <View className="flex-row items-center px-5 pb-2 pt-safe-offset-2">
            <Pressable onPress={onBack} hitSlop={16} disabled={!onBack} className="h-9 w-9 items-center justify-center">
              {onBack && <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />}
            </Pressable>
            {step !== undefined ? <WizardProgress step={step} total={totalSteps} /> : <View className="flex-1" />}
            {/* Mirror of the back arrow's width so the progress bar stays
                truly centered, not pushed right by the arrow. */}
            <View className="h-9 w-9" />
          </View>
        )}

        {/* Only the top bar (back + progress) is fixed. The title/
            subheading live INSIDE the scroll view so they scroll away with
            the fields on a small screen instead of eating fixed vertical
            space. */}
        <ScrollView
          className="flex-1"
          contentContainerClassName={`gap-6 px-6 pb-6 ${showTopBar ? 'pt-7' : 'pt-safe-offset-8'}`}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text className="text-4xl font-medium leading-[42px] tracking-tight text-ink">{title}</Text>
            <Text className="mt-3 text-[16px] font-medium leading-[22px] text-ink/55">{subheading}</Text>
          </View>
          {children}
        </ScrollView>

        <View className="bg-white px-6 pb-safe-offset-4 pt-3">{footer}</View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

// Centered row of equal segments — filled ink up to and including `step`,
// faint for the rest.
export function WizardProgress({ step, total }: { step: number; total: number }) {
  return (
    <View className="flex-1 flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className={`h-[3px] w-6 rounded-full ${i < step ? 'bg-ink' : 'bg-ink/15'}`} />
      ))}
    </View>
  );
}

// A field group on the white page — just a label above the caller's own
// input. No card fill/border: on a flat white surface the faint-fill input
// carries the visual weight, which is the cleaner/premium look.
export function FieldCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2.5">
      <Text className="text-[15px] font-semibold text-ink/80">{label}</Text>
      {children}
    </View>
  );
}
