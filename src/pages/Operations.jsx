import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return dateStr.slice(0, 10);
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SERVICE_TYPE_LABELS = {
  oil_change: "Oil change",
  tire_rotation: "Tire rotation",
  brake_check: "Brake check",
  general_service: "General service",
  other: "Other",
};

const LOAD_STATUS_LABELS = {
  pending: "Pending",
  assigned: "Assigned",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function Operations() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState("behavior"); // 'behavior' | 'maintenance' | 'loads'
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("fleet_user") || "{}");

  useEffect(() => {
    api
      .listVehicles()
      .then(setVehicles)
      .catch((err) => {
        if (err.message.includes("token")) navigate("/");
      });
  }, []);

  function handleLogout() {
    localStorage.removeItem("fleet_token");
    localStorage.removeItem("fleet_user");
    navigate("/");
  }

  return (
    <div className="costs-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-row">
            <span className="brand-dot" />
            <span className="brand-label">Fleet Dispatch</span>
          </div>
          <div className="company-name">{user.company_name || "Fleet"}</div>
          <div className="nav-tabs">
            <Link className="nav-tab" to="/dashboard">Live Map</Link>
            <Link className="nav-tab" to="/costs">Costs</Link>
            <span className="nav-tab active">Operations</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <div style={{ padding: "16px" }}>
          <div className="list-section-label" style={{ padding: "0 0 8px" }}>
            Sections
          </div>
          <div className="ops-subnav">
            <button
              className={`ops-subnav-item ${activeTab === "behavior" ? "active" : ""}`}
              onClick={() => setActiveTab("behavior")}
            >
              Driver behavior
            </button>
            <button
              className={`ops-subnav-item ${activeTab === "maintenance" ? "active" : ""}`}
              onClick={() => setActiveTab("maintenance")}
            >
              Maintenance
            </button>
            <button
              className={`ops-subnav-item ${activeTab === "loads" ? "active" : ""}`}
              onClick={() => setActiveTab("loads")}
            >
              Loads
            </button>
          </div>
        </div>
      </aside>

      <main className="costs-main">
        {error && <div className="form-error">{error}</div>}

        {activeTab === "behavior" && <BehaviorSection vehicles={vehicles} setError={setError} />}
        {activeTab === "maintenance" && <MaintenanceSection vehicles={vehicles} setError={setError} />}
        {activeTab === "loads" && <LoadsSection vehicles={vehicles} setError={setError} />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------
// Driver behavior
// ---------------------------------------------------------------------
function BehaviorSection({ setError }) {
  const [summary, setSummary] = useState([]);
  const [events, setEvents] = useState([]);
  const [from, setFrom] = useState(daysAgoStr(7));
  const [to, setTo] = useState(todayStr());

  const load = useCallback(() => {
    Promise.all([
      api.getBehaviorSummary({ from, to }),
      api.getBehaviorEvents({ from, to }),
    ])
      .then(([s, e]) => {
        setSummary(s);
        setEvents(e);
      })
      .catch((err) => setError(err.message));
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="costs-header">
        <div>
          <div className="costs-title">Driver Behavior</div>
          <div className="costs-subtitle">
            Speeding and harsh braking, detected from GPS speed data — no OBD-II hardware required
          </div>
        </div>
        <div className="period-picker">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">Risk ranking by vehicle</span>
        </div>
        {summary.length === 0 ? (
          <div className="table-empty">
            No GPS data in this period yet. Behavior events are calculated from consecutive GPS pings.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Speeding events</th>
                <th>Harsh braking events</th>
                <th>Top speed</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.vehicle_id}>
                  <td className="mono">{row.plate_number}</td>
                  <td className="mono">
                    {row.speeding_count > 0 ? (
                      <span className="event-pill speeding">{row.speeding_count}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="mono">
                    {row.harsh_braking_count > 0 ? (
                      <span className="event-pill harsh_braking">{row.harsh_braking_count}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="mono">{Math.round(row.top_speed_kph)} km/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">Recent events</span>
        </div>
        {events.length === 0 ? (
          <div className="table-empty">No speeding or harsh-braking events in this period.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Vehicle</th>
                <th>Event</th>
                <th>Speed</th>
                <th>Limit</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 50).map((ev) => (
                <tr key={ev.id}>
                  <td className="mono">{formatDateTime(ev.recorded_at)}</td>
                  <td className="mono">{ev.plate_number}</td>
                  <td>
                    <span className={`event-pill ${ev.event_type}`}>
                      {ev.event_type === "speeding" ? "Speeding" : "Harsh braking"}
                    </span>
                  </td>
                  <td className="mono">{Math.round(ev.speed_kph)} km/h</td>
                  <td className="mono">{Math.round(ev.speed_limit_kph)} km/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------
function MaintenanceSection({ vehicles, setError }) {
  const [schedules, setSchedules] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "",
    service_type: "oil_change",
    interval_km: "",
    interval_days: "",
    last_service_date: todayStr(),
    notes: "",
  });

  const load = useCallback(() => {
    api
      .listMaintenance()
      .then(setSchedules)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.vehicle_id && vehicles.length > 0) {
      setForm((f) => ({ ...f, vehicle_id: vehicles[0].id }));
    }
  }, [vehicles]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.vehicle_id || (!form.interval_km && !form.interval_days)) return;
    setSubmitting(true);
    setError("");
    try {
      await api.createMaintenance({
        vehicle_id: form.vehicle_id,
        service_type: form.service_type,
        interval_km: form.interval_km ? parseFloat(form.interval_km) : undefined,
        interval_days: form.interval_days ? parseInt(form.interval_days) : undefined,
        last_service_date: form.last_service_date,
        notes: form.notes || undefined,
      });
      setForm((f) => ({ ...f, interval_km: "", interval_days: "", notes: "" }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function markServiced(id) {
    try {
      await api.updateMaintenance(id, { last_service_date: todayStr() });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteMaintenance(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const dueCount = schedules.filter((s) => s.is_due).length;

  return (
    <>
      <div className="costs-header">
        <div>
          <div className="costs-title">Maintenance Scheduling</div>
          <div className="costs-subtitle">
            Distance-based intervals use real GPS mileage — no manual odometer logging required
          </div>
        </div>
      </div>

      {dueCount > 0 && (
        <div className="alert-banner">
          {dueCount} vehicle{dueCount > 1 ? "s" : ""} due for service
        </div>
      )}

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">Add a schedule</span>
        </div>
        <form className="expense-form" onSubmit={handleSubmit}>
          <select
            value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
            required
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_number}
              </option>
            ))}
          </select>

          <select
            value={form.service_type}
            onChange={(e) => setForm({ ...form, service_type: e.target.value })}
          >
            {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Every N km (optional)"
            value={form.interval_km}
            onChange={(e) => setForm({ ...form, interval_km: e.target.value })}
          />

          <input
            type="number"
            placeholder="Every N days (optional)"
            value={form.interval_days}
            onChange={(e) => setForm({ ...form, interval_days: e.target.value })}
          />

          <input
            type="date"
            value={form.last_service_date}
            onChange={(e) => setForm({ ...form, last_service_date: e.target.value })}
          />

          <input
            className="full-width"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="expense-form-actions">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add schedule"}
            </button>
          </div>
        </form>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
          Provide at least one of km or days interval.
        </p>
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">Schedules</span>
        </div>
        {schedules.length === 0 ? (
          <div className="table-empty">No maintenance schedules yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Service</th>
                <th>Last serviced</th>
                <th>Since service</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.plate_number}</td>
                  <td>{SERVICE_TYPE_LABELS[s.service_type] || s.service_type}</td>
                  <td className="mono">{formatDate(s.last_service_date)}</td>
                  <td className="mono">
                    {s.distance_since_service_km} km / {s.days_since_service}d
                  </td>
                  <td>
                    {s.is_due ? (
                      <span className="status-pill due">Due now</span>
                    ) : (
                      <span className="status-pill ok">OK</span>
                    )}
                  </td>
                  <td style={{ display: "flex", gap: "10px" }}>
                    <button className="delete-link" onClick={() => markServiced(s.id)}>
                      Mark serviced
                    </button>
                    <button className="delete-link" onClick={() => handleDelete(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// Loads
// ---------------------------------------------------------------------
function LoadsSection({ vehicles, setError }) {
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    pickup_location: "",
    dropoff_location: "",
    cargo_description: "",
    reference_code: "",
    vehicle_id: "",
    driver_id: "",
  });

  const load = useCallback(() => {
    api
      .listLoads()
      .then(setLoads)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.pickup_location || !form.dropoff_location) return;
    setSubmitting(true);
    setError("");
    try {
      await api.createLoad({
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
        cargo_description: form.cargo_description || undefined,
        reference_code: form.reference_code || undefined,
        vehicle_id: form.vehicle_id || undefined,
      });
      setForm({
        pickup_location: "",
        dropoff_location: "",
        cargo_description: "",
        reference_code: "",
        vehicle_id: "",
        driver_id: "",
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.updateLoad(id, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function assignVehicle(id, vehicle_id) {
    if (!vehicle_id) return;
    try {
      await api.updateLoad(id, { vehicle_id, status: "assigned" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteLoad(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="costs-header">
        <div>
          <div className="costs-title">Loads</div>
          <div className="costs-subtitle">Assign vehicles to haulage jobs and track delivery status</div>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">Create a load</span>
        </div>
        <form className="expense-form" onSubmit={handleSubmit}>
          <input
            placeholder="Pickup location"
            value={form.pickup_location}
            onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
            required
          />
          <input
            placeholder="Dropoff location"
            value={form.dropoff_location}
            onChange={(e) => setForm({ ...form, dropoff_location: e.target.value })}
            required
          />
          <input
            placeholder="Reference code (optional)"
            value={form.reference_code}
            onChange={(e) => setForm({ ...form, reference_code: e.target.value })}
          />
          <select
            value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          >
            <option value="">Assign vehicle later</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_number}
              </option>
            ))}
          </select>
          <input
            className="full-width"
            placeholder="Cargo description (optional)"
            value={form.cargo_description}
            onChange={(e) => setForm({ ...form, cargo_description: e.target.value })}
          />
          <div className="expense-form-actions">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create load"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span className="panel-section-title">All loads</span>
        </div>
        {loads.length === 0 ? (
          <div className="table-empty">No loads yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Update</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontSize: "13px" }}>{l.pickup_location}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>→ {l.dropoff_location}</div>
                  </td>
                  <td className="mono">
                    {l.plate_number || (
                      <select
                        defaultValue=""
                        onChange={(e) => assignVehicle(l.id, e.target.value)}
                        style={{
                          background: "var(--panel-raised)",
                          border: "1px solid var(--border)",
                          borderRadius: "3px",
                          padding: "4px 6px",
                          color: "var(--text-primary)",
                          fontSize: "12px",
                        }}
                      >
                        <option value="">Assign…</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate_number}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill load-${l.status}`}>{LOAD_STATUS_LABELS[l.status]}</span>
                  </td>
                  <td>
                    <select
                      value={l.status}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      style={{
                        background: "var(--panel-raised)",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "4px 6px",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                      }}
                    >
                      {Object.entries(LOAD_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="delete-link" onClick={() => handleDelete(l.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
