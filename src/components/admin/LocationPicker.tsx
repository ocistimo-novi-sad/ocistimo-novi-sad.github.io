import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { roundCoordinate } from '../../lib/geo';
import { tempIcon } from '../map/map-icons';

function ClickPicker({
  onPick,
}: {
  onPick: (coordinates: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click: (event) => {
      onPick({
        latitude: roundCoordinate(event.latlng.lat),
        longitude: roundCoordinate(event.latlng.lng),
      });
    },
  });
  return null;
}

function SizeFix() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (coordinates: { latitude: number; longitude: number }) => void;
}) {
  return (
    <div className="picker-map">
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        minZoom={11}
        maxZoom={19}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="picker-map__canvas"
      >
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <ClickPicker onPick={onChange} />
        <Marker position={[latitude, longitude]} icon={tempIcon()} />
        <SizeFix />
      </MapContainer>
      <p className="picker-map__hint">
        Kliknite na mapu da postavite mesto okupljanja. Podaci:{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap saradnici
        </a>
      </p>
    </div>
  );
}
