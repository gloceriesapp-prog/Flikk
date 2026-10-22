'use client';

import { useEffect, useRef, useState } from 'react';
import { dueAlert, acceptanceWindow, type AlertOrder } from './alertTiming';

// One reusable player. Browsers may require a gesture before audible playback;
// a blocked cue is retried on the next click/key only while its order is live.
export function useOrderAlertSound(orders: AlertOrder[]) {
  const latest = useRef(orders);
  const [soundBlocked, setSoundBlocked] = useState(false);
  useEffect(() => { latest.current = orders; }, [orders]);

  useEffect(() => {
    const audio = new Audio('/audio/partner-alert.wav');
    audio.preload = 'auto';
    audio.volume = 0.6;
    const consumed = new Set<string>();
    const pending = new Map<string, number>();
    let disposed = false;
    let starting = false;
    let blocked = false;
    audio.load();

    const isLive = (id: string, now: number) => latest.current.some(order => {
      const window = acceptanceWindow(order);
      return order.id === id && order.status === 'placed' && !order.accepted_at && window !== null && now < window.deadline;
    });
    const play = () => {
      const now = Date.now();
      for (const [id, deadline] of pending) if (deadline <= now || !isLive(id, now)) pending.delete(id);
      if (!pending.size || starting || blocked || !audio.paused) return;
      starting = true;
      // Consume only this batch: later arrivals while play() settles remain queued.
      const batch = [...pending.keys()];
      audio.currentTime = 0;
      audio.volume = 0.6;
      void audio.play().then(() => {
        if (disposed) { audio.pause(); return; }
        batch.forEach(id => pending.delete(id));
        blocked = false;
        setSoundBlocked(false);
      }).catch(() => {
        blocked = true;
        if (!disposed) setSoundBlocked(true);
      }).finally(() => { starting = false; });
    };
    const tick = () => {
      const now = Date.now();
      const liveIds = new Set(latest.current.map(order => order.id));
      for (const key of consumed) if (!liveIds.has(key.slice(0, key.lastIndexOf(':')))) consumed.delete(key);
      for (const order of latest.current) {
        const cue = dueAlert(order, now, consumed);
        if (!cue) continue;
        cue.consume.forEach(key => consumed.add(key));
        pending.set(order.id, cue.deadline);
      }
      for (const id of pending.keys()) if (!isLive(id, now)) pending.delete(id);
      // Stop reminders immediately after acceptance, rejection or expiry.
      if (!latest.current.some(order => isLive(order.id, now))) {
        audio.pause();
        pending.clear();
      }
      play();
    };
    const onInteraction = () => { blocked = false; play(); };
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    audio.addEventListener('ended', play);
    window.addEventListener('pointerdown', onInteraction);
    window.addEventListener('keydown', onInteraction);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => {
      disposed = true;
      clearInterval(timer);
      audio.pause();
      audio.removeEventListener('ended', play);
      audio.removeAttribute('src');
      audio.load();
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { soundBlocked };
}
