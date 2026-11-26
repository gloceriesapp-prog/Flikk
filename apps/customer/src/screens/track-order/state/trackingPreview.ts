import { createContext, useContext } from 'react';

// Dev Track Order preview (TrackOrderPreviewScreen) serves its own sample
// order, so its requests need no signed-in customer. Always false in the app.
export const TrackingPreviewContext = createContext(false);
export const useTrackingPreview = () => useContext(TrackingPreviewContext);
