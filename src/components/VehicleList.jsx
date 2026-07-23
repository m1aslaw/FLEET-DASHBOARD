import { useState } from "react";

function freshnessStatus(recordedAt) {
  if (!recordedAt) return "offline";
  const ageSeconds = (Date.now() - new Date(recordedAt).getTime()) / 1000;
  if (ageSeconds < 60) return "live";
  if (ageSeconds < 600) return "stale";
  return "offline";
}

function timeAgo(recordedAt) {
  if (!recordedAt) return "no data yet";
  const seconds = Math.floor((Date.now() - new Date(recordedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function VehicleList({ vehicles, pings, selectedId, onSelect, onAddVehicle }) {
  const [showAdd, setShowAdd] = useState(false);
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!plate.trim()) return;
    setSubmitting(true);
    try {
      await onAddVehicle({ plate_number: plate.trim(), make: make.trim(), model: model.trim() });
      setPlate("");
      setMake("");
      setModel("");
      setShowAdd(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="vehicle-list">
        <div className="list-section-label">
          Vehicles ({vehicles.length})
        </div>

        {vehicles.length === 0 && (
          <div className="empty-state">
            No vehicles yet. Add one below, or create one via the API with
            plate_number set.
          </div>
        )}

        {vehicles.map((v) => {
          const ping = pings[v.id];
          const status = freshnessStatus(ping?.recorded_at);
          return (
            <div
              key={v.id}
              className={`vehicle-card ${selectedId === v.id ? "active" : ""}`}
              onClick={() => onSelect(v.id)}
            >
              <div className="vehicle-card-top">
                <span className="plate">{v.plate_number}</span>
                <span className="status-badge">
                  <span className={`status-dot ${status}`} />
                  {status}
                </span>
              </div>
              <div className="vehicle-meta">
                <div>{[v.make, v.model].filter(Boolean).join(" ") || v.vehicle_type || "—"}</div>
                <div className="vehicle-meta-row">
                  <span>Last seen</span>
                  <span className="vehicle-meta-value">{timeAgo(ping?.recorded_at)}</span>
                </div>
                {ping?.speed_kph != null && (
                  <div className="vehicle-meta-row">
                    <span>Speed</span>
                    <span className="vehicle-meta-value">{Math.round(ping.speed_kph)} km/h</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="add-vehicle-panel">
        {showAdd ? (
          <form onSubmit={handleAdd}>
            <input
              placeholder="Plate number (required)"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              autoFocus
              required
            />
            <input placeholder="Make (optional)" value={make} onChange={(e) => setMake(e.target.value)} />
            <input placeholder="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)} />
            <button className="btn-secondary" type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add vehicle"}
            </button>
          </form>
        ) : (
          <button className="btn-secondary" onClick={() => setShowAdd(true)}>
            + Add vehicle
          </button>
        )}
      </div>
    </>
  );
}
