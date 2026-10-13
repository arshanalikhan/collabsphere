'use client';

import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const icon = L.divIcon({ className: 'pin', html: '📍', iconSize: [24, 24] });

export default function EventMap({ events }) {
  return (
    <MapContainer center={[22.5, 79]} zoom={5} className="map">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {events.map((e) => (
        <Marker key={e._id} position={[e.location.coordinates[1], e.location.coordinates[0]]} icon={icon}>
          <Popup>
            <Link href={`/events/${e._id}`}>{e.title}</Link><br />
            {e.city} · {new Date(e.startsAt).toLocaleString('en-IN')}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
