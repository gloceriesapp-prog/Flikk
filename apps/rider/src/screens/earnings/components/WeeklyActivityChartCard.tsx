// Mon-Sun bar chart for whichever week EarningsWeekHeader has selected
// (utils/earnings.ts's getWeeklyActivity, generalized past "always this
// week" — see that file's own note). Grid lines (6 vertical column
// dividers + 1 horizontal line separating the bars from the weekday
// labels) are a real absolute-positioned overlay computed from the same
// 7-column layout the bars use, not a background image — sized off
// GRID_HEIGHT/day-column math so it always lines up regardless of bar
// values. Today's bar gets a lighter fill than the rest — an actual
// diagonal-stripe texture (the reference's exact look) would need an SVG
// pattern fill; approximated here with a lighter tint instead of a real
// repeating stripe, cheaper and still reads as "this bar is different."
//
// Any bar is tappable — tapping shows that day's ₹ tooltip, replacing
// whichever one was shown before (defaults to Today's, same as the
// original always-on-Today tooltip, until the rider taps a different
// day). A day with ₹0 has nothing worth showing a tooltip for, so tapping
// one just clears the tooltip instead.
//
// weeklyActivity is real data from the caller (useRiderEarnings via
// EarningsScreen) — the reference image's ₹1750/Mon-Sun numbers were only
// ever a visual sample, never hardcoded here.

import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { WeeklyActivityDay } from '../../../utils/earnings';

const BAR_AREA_HEIGHT = 110;
const LABEL_ROW_HEIGHT = 28;
const GRID_HEIGHT = BAR_AREA_HEIGHT + LABEL_ROW_HEIGHT;
const BAR_MIN_HEIGHT = 6;
const BAR_COLOR = '#1F7A5C';
const BAR_COLOR_TODAY = '#4FAE87';
const GRID_LINE_COLOR = '#E5E5E5';
const COLUMN_COUNT = 7;

interface Props {
  weeklyActivity: WeeklyActivityDay[];
}

export function WeeklyActivityChartCard({ weeklyActivity }: Props) {
  const maxValue = Math.max(...weeklyActivity.map((day) => day.total), 1);
  const todayIndex = weeklyActivity.findIndex((day) => day.isToday);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(todayIndex >= 0 ? todayIndex : null);

  // Resets the selection back to "today's tooltip by default" whenever a
  // different week gets selected (EarningsWeekHeader's arrows pass down a
  // fresh weeklyActivity array) — otherwise a tap made on last week's Wed
  // would still be "selected" after paging to this week, showing the
  // wrong day's tooltip.
  useEffect(() => {
    setSelectedIndex(todayIndex >= 0 ? todayIndex : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyActivity]);

  function handleSelect(index: number) {
    setSelectedIndex((current) => (current === index ? null : index));
  }

  // No horizontal padding on the outer card, and no rounded corners — the
  // grid lines need to reach the literal screen edge (an inset/rounded
  // container would always leave a gap no matter how the overlay inside
  // it is positioned). The tip/incentive pill sits in its own centered,
  // padded row instead — the weekday labels stay readable on their own
  // since each is centered within a ~1/7-screen-wide column, not because
  // the card has margin.
  return (
    <View style={{ backgroundColor: '#F8F8F8' }} className="w-full gap-5 py-5">
      <View style={{ width: '100%', height: GRID_HEIGHT, marginTop: 44 }}>
        {/* Grid overlay — pointerEvents none so it never intercepts taps
            meant for the bars/tooltip above it. 6 vertical lines at each
            1/7 width boundary + 1 horizontal line at the bar/label
            boundary, both computed off the same constants the bars and
            label row use, so nothing can drift out of alignment.
            Positioned via inline style (not the "absolute inset-0"
            className) — the horizontal line's `right: 0` needs this view
            to genuinely span 100% of its parent's width, and relying on
            the parent-with-only-height-set to stretch by default was
            leaving the whole overlay (lines included) short of the card's
            full width. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          {Array.from({ length: COLUMN_COUNT - 1 }, (_, i) => (
            <View
              key={i}
              style={{ position: 'absolute', left: `${((i + 1) / COLUMN_COUNT) * 100}%`, top: 0, bottom: 0, width: 1, backgroundColor: GRID_LINE_COLOR }}
            />
          ))}
          <View style={{ position: 'absolute', left: 0, right: 0, top: BAR_AREA_HEIGHT, height: 1, backgroundColor: GRID_LINE_COLOR }} />
        </View>

        <View className="flex-row items-end justify-between" style={{ height: BAR_AREA_HEIGHT }}>
          {weeklyActivity.map((day, index) => {
            const barHeight = Math.max(BAR_MIN_HEIGHT, (day.total / maxValue) * BAR_AREA_HEIGHT);
            return (
              <Pressable key={index} onPress={() => handleSelect(index)} className="flex-1 items-center justify-end">
                {selectedIndex === index && day.total > 0 ? (
                  <View
                    style={{ position: 'absolute', bottom: barHeight + 10 }}
                    className="flex-row items-center gap-1 rounded-full bg-ink px-3 py-1.5"
                  >
                    <Text className="text-[12px] font-semibold text-white">₹{day.total.toLocaleString('en-IN')}</Text>
                  </View>
                ) : null}
                <View className="w-4" style={{ height: barHeight, backgroundColor: day.isToday ? BAR_COLOR_TODAY : BAR_COLOR }} />
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center justify-between" style={{ height: LABEL_ROW_HEIGHT }}>
          {weeklyActivity.map((day, index) => (
            <View key={index} className="flex-1 items-center">
              <Text className={`text-[11.5px] ${day.isToday ? 'font-semibold text-ink' : 'font-medium text-ink/40'}`}>
                {day.isToday ? 'Today' : day.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
