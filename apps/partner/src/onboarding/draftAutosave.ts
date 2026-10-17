import { saveStoreDraft, type StoreDraftPatch } from '../api/auth';
import { ApiError } from '../api/client';
import { getSessionEpoch, onSessionReset } from '../store/sessionScope';
import { createDraftSaveQueue } from './draftSaveQueue';

const queue = createDraftSaveQueue<StoreDraftPatch>({
  epoch: getSessionEpoch,
  save: saveStoreDraft,
  // Draft values may contain PAN/contact details; never log the payload.
  onError: error => console.warn('Partner draft autosave unavailable', error instanceof ApiError ? error.code : 'NETWORK_ERROR'),
});
onSessionReset(queue.reset);
export const enqueueStoreDraft = queue.enqueue;
export const flushStoreDraftSaves = queue.flush;
