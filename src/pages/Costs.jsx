import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatKes(amount) {
  if (amount == null) return "—";
  return `KES ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  // Postgres DATE columns come back as full ISO timestamps via node-postgres;
  // slice to just the date portion (YYYY-MM-DD) rather than showing time/UTC noise.
  return dateStr.slice(0, 10);
}

export default function Costs() {
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fleetSummary, setFleetSummary] = useState(null);
  const [selectedVehicleSummary, setSelectedVehicleSummary] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [from, setFrom] = useState(daysAgoStr(30));
  const [to, setTo] = useState(todayStr());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("fleet_user") || "{}");

  const [form, setForm] = useState({
    vehicle_id: "",
    category: "fuel",
    amount_kes: "",
    liters: "",
    expense_date: todayStr(),
    notes: "",
  });

  const loadAll = useCallback(async () => {
    try {
      const [vehicleList, expenseList, fleet] = await Promise.all([
        api.listVehicles(),
        api.listExpenses({ from, to }),
        api.getFleetSummary({ from, to }),
      ]);
      setVehicles(vehicleList);
      setExpenses(expenseList);
      setFleetSummary(fleet);
      if (!form.vehicle_id && vehicleList.length > 0) {
        setForm((f) => ({ ...f, vehicle_id: vehicleList[0].id }));
      }
      if (!selectedVehicleId && vehicleList.length > 0) {
        setSelectedVehicleId(vehicleList[0].id);
      }
    } catch (err) {
      if (err.message.includes("token")) {
        navigate("/");
      } else {
        setError(err.message);
      }
    }
  }, [from, to]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedVehicleId) return;
    api
      .getVehicleSummary(selectedVehicleId, { from, to })
      .then(setSelectedVehicleSummary)
      .catch((err) => setError(err.message));
  }, [selectedVehicleId, from, to]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.vehicle_id || !form.amount_kes) return;
    setSubmitting(true);
    setError("");
    try {
      await api.createExpense({
        vehicle_id: form.vehicle_id,
        category: form.category,
        amount_kes: parseFloat(form.amount_kes),
        liters: form.liters ? parseFloat(form.liters) : undefined,
        expense_date: form.expense_date,
        notes: form.notes || undefined,
      });
      setForm((f) => ({ ...f, amount_kes: "", liters: "", notes: "" }));
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteExpense(id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

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
            <span className="nav-tab active">Costs</span>
            <Link className="nav-tab" to="/operations">Operations</Link>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <div style={{ padding: "16px" }}>
          <div className="list-section-label" style={{ padding: "0 0 8px" }}>
            Vehicle summary
          </div>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            style={{
              width: "100%",
              background: "var(--panel-raised)",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "8px 10px",
              color: "var(--text-primary)",
              fontSize: "13px",
              marginBottom: "12px",
            }}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_number}
              </option>
            ))}
          </select>

          {selectedVehicleSummary && (
            <>
              <div className="vehicle-card" style={{ cursor: "default" }}>
                <div className="vehicle-meta-row">
                  <span>Distance</span>
                  <span className="vehicle-meta-value">{selectedVehicleSummary.distance_km} km</span>
                </div>
                <div className="vehicle-meta-row">
                  <span>Total spend</span>
                  <span className="vehicle-meta-value">{formatKes(selectedVehicleSummary.total_expense_kes)}</span>
                </div>
                <div className="vehicle-meta-row">
                  <span>Cost / km</span>
                  <span className="vehicle-meta-value">
                    {selectedVehicleSummary.cost_per_km_kes != null
                      ? `KES ${selectedVehicleSummary.cost_per_km_kes}`
                      : "no distance data"}
                  </span>
                </div>
              </div>
              {selectedVehicleSummary.cost_per_km_kes == null && (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.5 }}>
                  Cost-per-km needs at least two GPS pings in this period to calculate distance traveled.
                </p>
              )}
            </>
          )}
        </div>
      </aside>

      <main className="costs-main">
        <div className="costs-header">
          <div>
            <div className="costs-title">Cost Tracking</div>
            <div className="costs-subtitle">Fuel, maintenance, and spend across your fleet</div>
          </div>
          <div className="period-picker">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-label">Total fleet spend</div>
            <div className="summary-card-value accent">
              {fleetSummary ? formatKes(fleetSummary.total_fleet_spend_kes) : "—"}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Fuel spend</div>
            <div className="summary-card-value">
              {fleetSummary ? formatKes(fleetSummary.vehicles.reduce((s, v) => s + v.fuel_kes, 0)) : "—"}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Maintenance spend</div>
            <div className="summary-card-value">
              {fleetSummary ? formatKes(fleetSummary.vehicles.reduce((s, v) => s + v.maintenance_kes, 0)) : "—"}
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-header">
            <span className="panel-section-title">Log an expense</span>
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

            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="fuel">Fuel</option>
              <option value="maintenance">Maintenance</option>
              <option value="toll">Toll</option>
              <option value="parking">Parking</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Amount (KES)"
              value={form.amount_kes}
              onChange={(e) => setForm({ ...form, amount_kes: e.target.value })}
              required
            />

            {form.category === "fuel" ? (
              <input
                type="number"
                step="0.01"
                placeholder="Liters (optional)"
                value={form.liters}
                onChange={(e) => setForm({ ...form, liters: e.target.value })}
              />
            ) : (
              <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            )}

            {form.category === "fuel" && (
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            )}

            <input
              className="full-width"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="expense-form-actions">
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Logging…" : "Log expense"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel-section">
          <div className="panel-section-header">
            <span className="panel-section-title">Recent expenses</span>
          </div>
          {expenses.length === 0 ? (
            <div className="table-empty">No expenses logged in this period yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{formatDate(e.expense_date)}</td>
                    <td className="mono">{e.plate_number}</td>
                    <td>
                      <span className={`category-pill ${e.category}`}>{e.category}</span>
                    </td>
                    <td className="mono">{formatKes(e.amount_kes)}</td>
                    <td>{e.notes || "—"}</td>
                    <td>
                      <button className="delete-link" onClick={() => handleDelete(e.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel-section">
          <div className="panel-section-header">
            <span className="panel-section-title">Spend by vehicle</span>
          </div>
          {!fleetSummary || fleetSummary.vehicles.length === 0 ? (
            <div className="table-empty">No vehicles yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Fuel</th>
                  <th>Maintenance</th>
                  <th>Other</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {fleetSummary.vehicles.map((v) => (
                  <tr key={v.vehicle_id}>
                    <td className="mono">{v.plate_number}</td>
                    <td className="mono">{formatKes(v.fuel_kes)}</td>
                    <td className="mono">{formatKes(v.maintenance_kes)}</td>
                    <td className="mono">{formatKes(v.other_kes)}</td>
                    <td className="mono">{formatKes(v.total_expense_kes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
