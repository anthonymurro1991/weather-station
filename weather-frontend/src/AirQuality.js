// AirQuality.js — Indicatore "qualità dell'aria" (European AQI)
//
// Consuma GET /api/airquality (backend). Dati diretti da Open-Meteo Air
// Quality API (nessuna API key, nessun calcolo nostro). Mostrato come un
// normale weather-metric: solo numero (AQI) e descrizione (es. "Buona").

import React, { useState, useEffect, useCallback } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
// La qualità dell'aria cambia lentamente: il backend ha già una cache di
// ~15 minuti, il poll frontend serve solo ad aggiornare la UI di conseguenza.
const POLL_MS = 5 * 60 * 1000;

export default function AirQuality() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/airquality`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, POLL_MS);
    return () => clearInterval(poll);
  }, [fetchData]);

  if (error && !data) {
    return (
      <div className="weather-metric">
        <div className="metric-header">
          <span>Qualità dell'Aria</span>
        </div>
        <div className="metric-value">N/D</div>
      </div>
    );
  }
  if (!data) return null;

  const { aqi, status } = data;

  const level =
    status?.level === "ok"
      ? "good"
      : status?.level === "watch"
        ? "moderate"
        : "bad";

  return (
    <div className="weather-metric">
      <div className="metric-header">
        <span>Qualità dell'Aria</span>
      </div>
      <div className={`metric-value metric-value--aqi-${level}`}>
        {aqi != null ? Math.round(aqi) : "N/D"}
      </div>
      <div className="metric-stats">
        <div className={`aqi-badge aqi-badge--${level}`}>
          {status?.label || "N/D"}
        </div>
      </div>
    </div>
  );
}
