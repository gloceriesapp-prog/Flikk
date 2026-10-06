import { PREVIEW_LOCAL_BRANDS } from '../../groceries/local-brands/data';

interface DistrictBrandCollection {
  id: string;
  district: string;
  bounds: { south: number; north: number; west: number; east: number };
  brandIds: string[];
}

// Link checked VERIFIED_LOCAL_BRANDS IDs to their actual district coverage.
// Seller proximity does not verify a brand's place of origin.
export const DISTRICT_BRAND_COLLECTIONS: DistrictBrandCollection[] = [];
export const DISTRICT_BRAND_PREVIEWS = PREVIEW_LOCAL_BRANDS.slice(0, 3);
