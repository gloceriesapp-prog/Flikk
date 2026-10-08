// Category list a founder picks from when onboarding a store — matches
// StoreDetailForm's own pre-existing list, kept here now that AddStoreModal
// needs the same set.
import { STORE_CATEGORIES } from '../../../../backend/src/stores/validation';
export { STORE_CATEGORIES };
export type StoreCategory = (typeof STORE_CATEGORIES)[number];
