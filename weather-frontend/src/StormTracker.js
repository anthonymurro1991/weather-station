// StormTracker.js — Pannello "storm tracker" custom (cella tracciata, ETA, grandine/CAPE)
//
// Consuma GET /api/stormtracking (backend). Limiti dichiarati:
//   - Grandine: stima euristica (CAPE/codice meteo/zero termico), non rilevazione radar diretta.
//   - Raffiche: forecast diretto di Open-Meteo, non una misura.
//   - Fulmini: non inclusi (nessuna fonte gratuita ufficiale disponibile).

import React, { useState, useEffect, useCallback } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
// Il backend ha già una cache di ~2 minuti: il poll frontend serve solo ad
// aggiornare la UI quando la cache lato server scade.
const POLL_MS = 30 * 1000;

function formatMinutes(min) {
  if (min == null) return "N/D";
  if (min < 1) return "< 1 min";
  return `${Math.round(min)} min`;
}

function Row({ label, value, valueClassName }) {
  return (
    <div className="storm-row">
      <span className="storm-row-label">{label}</span>
      <span className={`storm-row-value ${valueClassName || ""}`}>{value}</span>
    </div>
  );
}

export default function StormTracker() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/stormtracking`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setCountdown((json.refreshIntervalMinutes || 5) * 60);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, POLL_MS);
    return () => clearInterval(poll);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c != null && c > 0 ? c - 1 : c));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  if (error && !data) {
    return (
      <div className="storm-tracker-card">
        <div className="storm-header">
          <span className="storm-title">Storm Tracker</span>
        </div>
        <div className="storm-error">Dato non disponibile</div>
      </div>
    );
  }
  if (!data) return null;

  const {
    cell,
    hail,
    estimatedGustKmh,
    capeJkg,
    status,
    radiusKm,
    situazione,
  } = data;

  const countdownLabel =
    countdown != null
      ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
      : "--";

  return (
    <div className="storm-tracker-card">
      <div className="storm-header">
        <span className="storm-title">Storm Tracker</span>
        <span className="storm-subtitle">
          Raggio {radiusKm} km · Aggiornamento ogni{" "}
          {data.refreshIntervalMinutes} min
        </span>
      </div>

      <div className={`storm-status storm-status--${status?.level || "ok"}`}>
        {status?.label || "N/D"}
      </div>

      <div className="storm-rows">
        <Row
          label="Situazione"
          value={situazione}
          valueClassName={!cell ? "storm-row-value--ok" : ""}
        />
        <Row
          label="Posizione cella"
          value={
            cell
              ? (cell.placeName ??
                `${cell.centroidLat.toFixed(2)}, ${cell.centroidLon.toFixed(2)}`)
              : "N/D"
          }
        />
        <Row
          label="Distanza"
          value={cell ? `${cell.distanceKm.toFixed(1)} km` : "N/D"}
        />
        <Row
          label="Direzione"
          value={
            cell
              ? `${cell.directionFromHomeCompass} (${Math.round(cell.directionFromHomeDeg)}°)`
              : "N/D"
          }
        />
        <Row
          label="Moto cella"
          value={
            cell?.movingTowardCompass
              ? `verso ${cell.movingTowardCompass}, ${Math.round(cell.speedKmh)} km/h`
              : "N/D"
          }
        />
        <Row
          label="Intensità"
          value={cell ? `${cell.maxIntensityMm.toFixed(1)} mm/15min` : "N/D"}
        />
        <Row
          label="Arrivo previsto"
          value={cell ? formatMinutes(cell.etaMinutes) : "N/D"}
        />
        <Row label="Tendenza" value={cell ? cell.trend : "N/D"} />
        <Row
          label="Grandine"
          value={
            hail ? `${hail.risk}${hail.size ? ` (${hail.size})` : ""}` : "N/D"
          }
        />
        <Row
          label="Raffica stimata"
          value={
            estimatedGustKmh != null
              ? `${Math.round(estimatedGustKmh)} km/h`
              : "N/D"
          }
        />
        <Row
          label="CAPE"
          value={
            capeJkg != null
              ? `${Math.round(capeJkg)} J/kg (${hail?.capeCategory})`
              : "N/D"
          }
        />
        <Row
          label="Aggiornato"
          value={new Date(data.updatedAt).toLocaleTimeString("it-IT")}
        />
        <Row label="Nuovi dati in" value={countdownLabel} />
      </div>

      <div className="storm-attribution">
        ICON-D2/AROME ·{" "}
        <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>
      </div>
    </div>
  );
}
