export interface HomeGrower {
  id: string;
  name: string;
  locality: string;
  verified: boolean;
  photoUrl?: string;
  introduction?: string;
  productIds: string[];
}

// Add only checked grower identities/localities and linked real produce IDs.
// Seller approval or district does not establish home-grown provenance.
export const VERIFIED_HOME_GROWERS: HomeGrower[] = [];
export const PREVIEW_HOME_GROWERS: HomeGrower[] = [
  { id: 'grower-preview-a', name: 'Sample Grower A', locality: 'Demo locality', verified: false, productIds: [] },
  { id: 'grower-preview-b', name: 'Sample Grower B', locality: 'Demo locality', verified: false, productIds: [] },
];
