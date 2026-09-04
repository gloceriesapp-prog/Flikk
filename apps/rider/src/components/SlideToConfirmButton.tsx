// Swipe-to-confirm action — same recipe as apps/partner's own
// SlideToConfirmButton.tsx (RN's built-in Animated + PanResponder, no
// gesture-handler dependency to add). Dragging the white knob to the end
// of the black track fires onConfirm; letting go short of the threshold
// springs it back. A green "confirm" fill grows in from the left as you
// drag, tracking the knob, then locks in fully green with a checkmark +
// success label and a haptic pop once the threshold is crossed.
//
// Fixed vs. the partner version this was ported from: that one hardcodes
// "Ready for Pickup" instead of rendering its own `label` prop — this copy
// actually renders `label`, since a slide button whose idle text can't
// change isn't reusable for anything but that one screen.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';

const KNOB_SIZE = 60;
const TRACK_PADDING = 4;
const REST_FILL_WIDTH = KNOB_SIZE + TRACK_PADDING * 2;
const CONFIRM_THRESHOLD = 0.7;
// How long the green "done" state stays on screen before onConfirm fires
// — long enough to register, short enough to not feel like a stall.
const SUCCESS_HOLD_MS = 420;

interface Props {
  label: string;
  successLabel: string;
  onConfirm: () => void;
}

export function SlideToConfirmButton({ label, successLabel, onConfirm }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  // translateX drives the knob's transform (native driver — smooth 60fps
  // drag). fillWidth mirrors the same distance into the green fill's
  // `width` style, which layout properties can't animate on the native
  // thread — kept in sync by hand in every handler below rather than
  // derived via .interpolate(), since an interpolation of a native-driven
  // value stays native-only and a JS-driven width style would never see it.
  const translateX = useMemo(() => new Animated.Value(0), []);
  const fillWidth = useMemo(() => new Animated.Value(0), []);
  const successProgress = useMemo(() => new Animated.Value(0), []);
  const confirmedRef = useRef(false);
  const maxTranslateRef = useRef(0);
  const trackWidthRef = useRef(0);
  const maxTranslate = Math.max(trackWidth - KNOB_SIZE - TRACK_PADDING * 2, 0);

  useEffect(() => {
    maxTranslateRef.current = maxTranslate;
    trackWidthRef.current = trackWidth;
  }, [maxTranslate, trackWidth]);

  const panResponder = useMemo(
    () =>
      // confirmedRef/maxTranslateRef/trackWidthRef below are only ever read
      // inside PanResponder's touch callbacks (event handlers, not render)
      // — refs exist precisely so these handlers see live values without
      // recreating the responder on every layout/animation frame.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2,
        onPanResponderMove: (_, gesture) => {
          if (confirmedRef.current) return;
          const dragged = Math.min(Math.max(gesture.dx, 0), maxTranslateRef.current);
          translateX.setValue(dragged);
          fillWidth.setValue(REST_FILL_WIDTH + dragged);
        },
        onPanResponderRelease: (_, gesture) => {
          if (confirmedRef.current) return;
          const max = maxTranslateRef.current;
          const progress = max === 0 ? 0 : gesture.dx / max;

          if (progress >= CONFIRM_THRESHOLD) {
            confirmedRef.current = true;
            Animated.timing(translateX, { toValue: max, duration: 150, useNativeDriver: true }).start();
            Animated.timing(fillWidth, { toValue: trackWidthRef.current, duration: 150, useNativeDriver: false }).start();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Animated.timing(successProgress, { toValue: 1, duration: 260, delay: 60, useNativeDriver: true }).start(() => {
              setTimeout(onConfirm, SUCCESS_HOLD_MS);
            });
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
            Animated.spring(fillWidth, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
          }
        },
      }),
    [fillWidth, onConfirm, successProgress, translateX]
  );

  const idleOpacity = successProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      className="h-[64px] w-full justify-center overflow-hidden rounded-full bg-ink"
    >
      {/* Green "confirm" fill — grows in from the left as the knob drags,
          tracking it exactly, so the confirm state arrives progressively. */}
      <Animated.View pointerEvents="none" style={{ width: fillWidth }} className="absolute inset-y-0 left-0 rounded-full bg-success" />

      <Animated.View style={{ opacity: idleOpacity }} className="absolute w-full items-center">
        <Text className="text-[15px] font-bold text-white">{label}</Text>
      </Animated.View>

      {/* Stacked after the idle label so it sits on top once idleOpacity
          fades that layer out — declaration order is stacking order here,
          both are absolutely positioned over the same spot. */}
      <Animated.View pointerEvents="none" style={{ opacity: successProgress }} className="absolute inset-0 items-center justify-center">
        <View className="flex-row items-center gap-2">
          <AppIcon icon={CheckmarkCircle02Icon} size={18} color="#FFFFFF" />
          <Text className="text-[15px] font-bold text-white">{successLabel}</Text>
        </View>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }], marginLeft: TRACK_PADDING, opacity: idleOpacity }}
        className="h-[56px] w-[56px] items-center justify-center rounded-full bg-white"
      >
        <AppIcon icon={ArrowRight01Icon} size={22} color={colors.ink} />
      </Animated.View>
    </View>
  );
}
