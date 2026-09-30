// Shared submit logic for "bring the app to my area" — both UpvoteAreaBar
// (floating bottom pill) and UnavailableZoneScreen (inline button) call
// this instead of duplicating the same fetch/loading/voted state twice.
//
// Votes are anonymous (POST /area-upvotes, no auth — see that route's own
// note), so the only way to remember "this device already voted for this
// address" across an app refresh/relaunch is a local flag, keyed by the
// exact addressLabel — not a single global flag, so moving to a different
// unserviceable address still offers a real vote instead of showing
// "Thanks" for an area this device never actually voted for.
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitAreaUpvote } from '../api/areaUpvotes';
import { useLocationStore } from '../store/useLocationStore';

const STORAGE_KEY_PREFIX = 'gloceries_area_upvote_voted:';

export function useAreaUpvote() {
  const location = useLocationStore((s) => s.location);
  const addressLabel = location?.addressLabel;
  const [voted, setVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = addressLabel
      ? AsyncStorage.getItem(STORAGE_KEY_PREFIX + addressLabel).then((value) => value === 'true')
      : Promise.resolve(false);
    load.then((isVoted) => {
      if (!cancelled) setVoted(isVoted);
    });
    return () => {
      cancelled = true;
    };
  }, [addressLabel]);

  async function upvote() {
    if (voted || submitting || !location) return;
    setSubmitting(true);
    try {
      await submitAreaUpvote({
        latitude: location.latitude,
        longitude: location.longitude,
        addressLabel: location.addressLabel,
      });
      await AsyncStorage.setItem(STORAGE_KEY_PREFIX + location.addressLabel, 'true');
      setVoted(true);
    } catch {
      Alert.alert('Could not submit', 'Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return { voted, submitting, upvote };
}
