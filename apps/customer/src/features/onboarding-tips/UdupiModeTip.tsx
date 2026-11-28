// First-open coach mark for the Gloceries / Udupi switch: the screen dims,
// a ring circles the Udupi tab, a curved dashed arrow runs from a
// rounded card up to it. "Show me" switches to Udupi; "Got it" or a tap
// anywhere closes it. Shown once per install (useOnboardingTipsStore).
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useHomeModeStore } from '../../screens/home/mode-switch/useHomeModeStore';
import { actionColors } from '../../theme/tokens';
import { arrowHead, udupiTabRect } from './udupiTipLayout';
import { useOnboardingTipsStore, useTipDue } from './useOnboardingTipsStore';

const SHOW_DELAY_MS = 900; // let Home settle before dimming it
const RING_PAD = 5;
const ARROW_DROP = 64; // ring foot to card top, room for the curve
const CARD_MAX = 320;

export function UdupiModeTip({ ready }: { ready: boolean }) {
  const mode = useHomeModeStore((s) => s.mode);
  const setMode = useHomeModeStore((s) => s.setMode);
  const markSeen = useOnboardingTipsStore((s) => s.markSeen);
  const due = useTipDue('udupi-mode', ready && mode === 'gloceries');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!due) return;
    const timer = setTimeout(() => { setOpen(true); markSeen('udupi-mode'); }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [due, markSeen]);
  // Found Udupi on their own: no need to point at it any more.
  useEffect(() => { if (mode === 'udupi') markSeen('udupi-mode'); }, [mode, markSeen]);

  if (!open) return null;
  const close = () => setOpen(false);
  return <TipOverlay onClose={close} onTry={() => { setMode('udupi'); close(); }} />;
}

function TipOverlay({ onClose, onTry }: { onClose: () => void; onTry: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tab = udupiTabRect(width, insets.top);
  const ring = { x: tab.x - RING_PAD, y: tab.y - RING_PAD, width: tab.width + RING_PAD * 2, height: tab.height + RING_PAD * 2 };
  const cardWidth = Math.min(width - 32, CARD_MAX);
  const cardTop = ring.y + ring.height + ARROW_DROP;
  const cardLeft = Math.max(16, width - 16 - cardWidth);
  // Arrow: from the card's top (left third) curving up into the ring's foot.
  const start = { x: cardLeft + cardWidth * 0.3, y: cardTop - 6 };
  const end = { x: ring.x + ring.width / 2, y: ring.y + ring.height + 8 };
  // Bend point straight under the tab: the line sweeps across, then comes
  // up vertically into the Udupi tab.
  const control = { x: end.x, y: (start.y + end.y) / 2 + 8 };
  const head = arrowHead(control, end);

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close tip" onPress={onClose} className="flex-1" style={{ backgroundColor: 'rgba(8,12,11,0.66)' }} testID="udupi-tip">
        <View pointerEvents="none" style={{
          position: 'absolute', left: ring.x, top: ring.y, width: ring.width, height: ring.height,
          borderRadius: 16, borderWidth: 2, borderColor: '#FFFFFF',
        }} />
        <Svg pointerEvents="none" width={width} height={cardTop + 4} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`} stroke="#FFFFFF" strokeWidth={2.5}
            strokeDasharray="6 6" strokeLinecap="round" fill="none" />
          <Path d={head} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
        <View style={{ position: 'absolute', top: cardTop, left: cardLeft, width: cardWidth }}>
          {/* Inner Pressable swallows taps so the card itself doesn't close the tip. */}
          <Pressable accessibilityRole="none" onPress={() => {}} className="rounded-[28px] bg-white p-5" style={{ borderTopRightRadius: 10 }}>
            <View className="mb-2 self-start rounded-full bg-[#E2E175] px-2.5 py-0.5">
              <Text className="text-[11px] font-bold tracking-[0.6px] text-[#111715]">NEW</Text>
            </View>
            <Text className="text-[19px] font-bold tracking-[-0.4px] text-ink">Udupi mode is here</Text>
            <Text className="mt-1 text-[14px] leading-[20px] text-ink/60">Local Tulunadu favourites in one place. Tap Udupi up top to switch anytime.</Text>
            <View className="mt-4 flex-row items-center justify-end gap-2">
              <Pressable accessibilityRole="button" onPress={onClose} className="h-11 justify-center rounded-full px-4 active:opacity-70">
                <Text className="text-[15px] font-semibold text-ink/70">Got it</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onTry} className="h-11 justify-center rounded-full px-5 active:opacity-85" style={{ backgroundColor: actionColors.fill }}>
                <Text className="text-[15px] font-semibold text-white">Show me</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
