// components/OpenStreetMap.js
'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { useTranslations } from 'next-intl';

interface OpenStreetMapProps {
  lat: number;
  lon: number;
}

const OpenStreetMap = ({ lat, lon }: OpenStreetMapProps) => {
  const t = useTranslations();
  useEffect(() => {
    // Create map instance
    const map = L.map('map').setView([lat, lon], 13);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    }).addTo(map);

    // Add a marker at the provided latitude and longitude
    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(t('misc.map.yourLocation'))
      .openPopup();

    return () => {
      map.remove();
    };
  }, [lat, lon, t]);

  return <div id="map" style={{ height: '100%', width: '100%' }}></div>;
};

export default OpenStreetMap;
