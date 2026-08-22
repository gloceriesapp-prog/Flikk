// The OS-notification half of a reminder — reaches a shop owner who's put
// the phone down, unlike the in-app banner (OrderReminderBanner.tsx) which
// only shows while the app is open. Deliberately a different tool than
// features/incoming-order-alert/playOrderAlertSound.ts's expo-audio setup:
// expo-audio only plays while this app's process is alive, it can't
// surface anything in the notification shade or fire while backgrounded.
// A reminder specifically needs to reach someone who isn't looking at the
// app right now, so it needs the notification APIs, not the audio ones —
// each tool doing the job it's actually built for.
//
// Local, not push — same scheduleNotificationAsync(trigger: null) pattern
// this app used for alerts before switching to expo-audio for the louder,
// silent-mode-defeating case; a reminder is fine with the OS's own
// notification sound, it isn't trying to be heard over a muted phone the
// way the initial alert is.

import * as Notifications from 'expo-notifications';
import type { ReminderStage } from './orderExpiry';

// Without this, a notification fired while the app is in the foreground
// (the exact case here, most of the time — the shop owner has the app
// open on some other tab) shows nothing and plays nothing on some
// platform versions. Makes foreground notifications behave the same as
// backgrounded ones: banner + sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_COPY: Record<ReminderStage, { title: string; body: (customerName: string) => string }> = {
  first: {
    title: 'Order still waiting',
    body: (customerName) => `${customerName}'s order hasn't been accepted yet — take a look when you can.`,
  },
  final: {
    title: 'Order about to be auto-rejected',
    body: (customerName) => `${customerName}'s order will be auto-rejected soon if it isn't accepted.`,
  },
};

let permissionRequested = false;

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionRequested) return false;
  permissionRequested = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function sendOrderReminderNotification(customerName: string, stage: ReminderStage): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) return;

  const copy = REMINDER_COPY[stage];
  await Notifications.scheduleNotificationAsync({
    content: { title: copy.title, body: copy.body(customerName), sound: true },
    trigger: null, // fires immediately — this is "remind me now," not a scheduled reminder
  });
}
