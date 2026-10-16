'use client';

import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { formatWhen } from '@/lib/time';

const icon = L.divIcon({ className: 'pin', html: '📍', iconSize: [24, 24] });

// Events as pins; peers as one circle per city (counts only, never individual locations)
export default function EventMap({ events, peerCities = [] }) {
  return (
    <MapContainer center={[22.5, 79]} zoom={5} className="map">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {peerCities.map((c) => (
        <CircleMarker key={c.city} center={[c.coordinates[1], c.coordinates[0]]} radius={7 + 3 * Math.sqrt(c.count)}
          pathOptions={{ color: '#23302a', weight: 2, fillColor: '#7cc46a', fillOpacity: 0.55 }}>
          <Popup>
            <b>{c.count} {c.count === 1 ? 'student' : 'students'} in {c.city}</b><br />
            {c.houses.join(', ')}
          </Popup>
        </CircleMarker>
      ))}
      {events.map((e) => (
        <Marker key={e._id} position={[e.location.coordinates[1], e.location.coordinates[0]]} icon={icon}>
          <Popup>
            <Link href={`/events/${e._id}`}>{e.title}</Link><br />
            {e.city} · {formatWhen(e.startsAt)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
