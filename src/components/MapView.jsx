import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";

const DEFAULT_CENTER = [-1.286389, 36.817223]; // Nairobi, used when no vehicles have location yet

function vehicleIcon() {
  const html = renderToStaticMarkup(
    <div className="vehicle-marker">
      <div className="vehicle-marker-ring" />
      <div className="vehicle-marker-core" />
    </div>
  );
  return L.divIcon({
    html,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Recenters the map when the selected vehicle or its location changes
function MapRecenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }, [position]);
  return null;
}

export default function MapView({ vehicles, pings, selectedId, historyPath, showingHistory }) {
  const icon = useMemo(() => vehicleIcon(), []);

  const markers = vehicles
    .map((v) => {
      const ping = pings[v.id];
      if (!ping) return null;
      return { vehicle: v, position: [ping.lat, ping.lng], ping };
    })
    .filter(Boolean);

  const selectedMarker = markers.find((m) => m.vehicle.id === selectedId);
  const center = selectedMarker?.position || markers[0]?.position || DEFAULT_CENTER;

  if (markers.length === 0) {
    return (
      <div className="map-empty">
        <div className="map-empty-title">No live locations yet</div>
        <div>Submit a GPS ping via the API to see a vehicle appear here.</div>
      </div>
    );
  }

  return (
    <MapContainer center={center} zoom={13} zoomControl={false}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map(({ vehicle, position, ping }) => (
        <Marker key={vehicle.id} position={position} icon={icon}>
          <Popup>
            <strong>{vehicle.plate_number}</strong>
            <br />
            {ping.speed_kph != null ? `${Math.round(ping.speed_kph)} km/h` : "speed unknown"}
            <br />
            {new Date(ping.recorded_at).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}

      {showingHistory && historyPath.length > 1 && (
        <Polyline
          positions={historyPath}
          pathOptions={{ color: "#f5a623", weight: 3, opacity: 0.8 }}
        />
      )}

      {selectedMarker && <MapRecenter position={selectedMarker.position} />}
    </MapContainer>
  );
}
