'use client';

import dynamic from 'next/dynamic';

// Leaflet touches window, so load it on the client only
export default dynamic(() => import('./EventMap'), {
  ssr: false,
  loading: () => <div className="map skeleton" aria-label="Loading map" />,
});
