import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import VehicleList from "../components/VehicleList";
import MapView from "../components/MapView";

const POLL_INTERVAL_MS = 8000;

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [pings, setPings] = useState({}); // vehicleId -> latest ping
  const [selectedId, setSelectedId] = useState(null);
  const [showingHistory, setShowingHistory] = useState(false);
  const [historyPath, setHistoryPath] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("fleet_user") || "{}");

  const loadVehicles = useCallback(async () => {
    try {
      const data = await api.listVehicles();
      setVehicles(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    } catch (err) {
      if (err.message.includes("token")) {
        handleLogout();
      } else {
        setError(err.message);
      }
    }
  }, [selectedId]);

  const refreshPings = useCallback(async (vehicleList) => {
    const results = await Promise.all(
      vehicleList.map(async (v) => {
        const ping = await api.getLatestPing(v.id);
        return [v.id, ping];
      })
    );
    setPings((prev) => ({ ...prev, ...Object.fromEntries(results) }));
  }, []);

  // Initial load
  useEffect(() => {
    loadVehicles();
  }, []);

  // Poll for live updates
  useEffect(() => {
    if (vehicles.length === 0) return;
    refreshPings(vehicles);
    const interval = setInterval(() => refreshPings(vehicles), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [vehicles, refreshPings]);

  async function handleAddVehicle(payload) {
    const created = await api.createVehicle(payload);
    setVehicles((prev) => [created, ...prev]);
    setSelectedId(created.id);
  }

  async function toggleHistory() {
    if (showingHistory) {
      setShowingHistory(false);
      return;
    }
    if (!selectedId) return;
    setLoadingHistory(true);
    try {
      const data = await api.getHistory(selectedId, { limit: 500 });
      setHistoryPath(data.map((p) => [p.lat, p.lng]));
      setShowingHistory(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("fleet_token");
    localStorage.removeItem("fleet_user");
    navigate("/");
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedId);
  const selectedPing = selectedId ? pings[selectedId] : null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-row">
            <span className="brand-dot" />
            <span className="brand-label">Fleet Dispatch</span>
          </div>
          <div className="company-name">{user.company_name || "Fleet"}</div>
          <div className="nav-tabs">
            <span className="nav-tab active">Live Map</span>
            <Link className="nav-tab" to="/costs">Costs</Link>
            <Link className="nav-tab" to="/operations">Operations</Link>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <VehicleList
          vehicles={vehicles}
          pings={pings}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setShowingHistory(false);
          }}
          onAddVehicle={handleAddVehicle}
        />
      </aside>

      <main className="map-area">
        <div className="map-topbar">
          {selectedVehicle ? (
            <div className="selected-vehicle-panel">
              <div className="selected-plate">{selectedVehicle.plate_number}</div>
              <div className="selected-meta">
                <div className="selected-meta-item">
                  Speed
                  <div className="selected-meta-value">
                    {selectedPing?.speed_kph != null ? `${Math.round(selectedPing.speed_kph)} km/h` : "—"}
                  </div>
                </div>
                <div className="selected-meta-item">
                  Coordinates
                  <div className="selected-meta-value">
                    {selectedPing ? `${selectedPing.lat.toFixed(4)}, ${selectedPing.lng.toFixed(4)}` : "—"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}

          <button
            className={`history-toggle ${showingHistory ? "active" : ""}`}
            onClick={toggleHistory}
            disabled={!selectedId || loadingHistory}
          >
            {loadingHistory ? "Loading…" : showingHistory ? "Hide route" : "Show route history"}
          </button>
        </div>

        <MapView
          vehicles={vehicles}
          pings={pings}
          selectedId={selectedId}
          historyPath={historyPath}
          showingHistory={showingHistory}
        />
      </main>
    </div>
  );
}
