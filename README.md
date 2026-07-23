# Fleet Dispatch Dashboard — Week 3-4

React + Leaflet dashboard for the fleet backend. Covers:
- Fleet owner login
- Vehicle list with live status (live / stale / offline based on ping freshness)
- Live map with pulsing vehicle markers, auto-refreshing every 8 seconds
- Route history playback (draws the path from stored GPS pings)
- Add vehicle directly from the sidebar

## Setup

### 1. Make sure your backend is running
This dashboard expects your backend at `http://localhost:4000` (from the Week 1-2 build). Keep that running in its own terminal window.

### 2. Install dependencies
```bash
npm install
```

### 3. Start the dashboard
```bash
npm run dev
```
Opens at `http://localhost:3000`.

### 4. One backend config check
Your backend's `.env` has:
```
CORS_ORIGIN=http://localhost:3000
```
This already matches the dashboard's port, so no change needed — but if you changed the backend's port or CORS setting earlier, make sure it still allows `http://localhost:3000`.

## Using it

1. Go to `http://localhost:3000`
2. Log in with the fleet owner account you created earlier via curl (e.g. `owner@test.com` / `password123`)
3. You'll land on the dashboard — any vehicles you already created via curl will show up in the sidebar
4. Click a vehicle to select it and center the map on its last known location
5. Click **"Show route history"** to draw its recorded path on the map
6. Use **"+ Add vehicle"** in the sidebar to create new vehicles without touching curl again

## How live updates work
The dashboard polls `/api/gps/vehicles/:id/latest` for every vehicle every 8 seconds. A vehicle's status badge shows:
- **live** (green, pulsing) — pinged within the last 60 seconds
- **stale** (amber) — pinged within the last 10 minutes
- **offline** (red) — no recent ping

To see a vehicle go "live" in the dashboard, submit a fresh GPS ping via curl (or your future driver app) with a `recorded_at` timestamp close to now:
```bash
curl -X POST http://localhost:4000/api/gps/ping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DRIVER_TOKEN>" \
  -d "{\"vehicle_id\":\"<VEHICLE_ID>\",\"lat\":-1.286389,\"lng\":36.817223,\"speed_kph\":35,\"recorded_at\":\"<CURRENT_ISO_TIMESTAMP>\"}"
```

## Notes on the map
This uses **Leaflet + OpenStreetMap** tiles instead of Mapbox — no API key or signup required, so it works immediately. If you want Mapbox's styling later (smoother tiles, custom styles), it's a straightforward swap in `MapView.jsx` — ask and I'll do it once you have a Mapbox token.

## What's next
- WebSocket layer (Socket.io) so the map updates instantly on a new ping instead of waiting for the 8-second poll
- React Native driver app that posts to `/api/gps/ping` on an interval with offline queueing
- Cost/fuel tracking screens (Phase 2 of the original plan)
