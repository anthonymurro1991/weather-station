// ─────────────────────────────────────────────────────────────────────────────
// alertCalculator.js
// Recupera previsioni da Open-Meteo per Bariano e genera alert meteo.
// Gratuito, nessuna API key, modello ItaliaMeteo-ARPAE (2 km).
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

const LAT = 45.5052;
const LON = 9.7024;

// Cache in-memory per limitare le chiamate a Open-Meteo (max 1 ogni 10 min)
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minuti
let _cache = null;       // { alerts: [], fetchedAt: number }
let _pending = null;     // Promise in corso (evita richieste parallele doppie)

// Codici WMO → categoria alert
const WMO_ALERTS = {
  // Temporali
  95: { type: "storm", label: "Temporale", level: "orange" },
  96: { type: "storm", label: "Temporale con grandine", level: "red" },
  99: { type: "storm", label: "Temporale con grandine intensa", level: "red" },
  // Neve
  71: { type: "snow", label: "Nevicata leggera", level: "yellow" },
  73: { type: "snow", label: "Nevicata moderata", level: "orange" },
  75: { type: "snow", label: "Nevicata intensa", level: "red" },
  77: { type: "snow", label: "Granelli di neve", level: "yellow" },
  85: { type: "snow", label: "Rovesci di neve", level: "orange" },
  86: { type: "snow", label: "Rovesci di neve intensi", level: "red" },
  // Pioggia intensa
  65: { type: "rain", label: "Pioggia intensa", level: "orange" },
  67: { type: "rain", label: "Pioggia gelata intensa", level: "red" },
  82: { type: "rain", label: "Rovesci violenti", level: "red" },
  // Pioggia moderata
  63: { type: "rain", label: "Pioggia moderata", level: "yellow" },
  81: { type: "rain", label: "Rovesci moderati", level: "yellow" },
  // Nebbia
  45: { type: "fog", label: "Nebbia", level: "yellow" },
  48: { type: "fog", label: "Nebbia ghiacciata", level: "orange" },
};

/**
 * Esegue la chiamata reale a Open-Meteo e costruisce l'array di alert.
 * Non chiamare direttamente: usa fetchAlerts() che gestisce la cache.
 */
async function _fetchFromOpenMeteo(currentObs) {
  const alerts = [];
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${LAT}&longitude=${LON}` +
    `&daily=weather_code,temperature_2m_max,precipitation_probability_max,wind_gusts_10m_max,uv_index_max` +
    `&timezone=Europe/Rome&forecast_days=1`;

  const { data } = await axios.get(url, { timeout: 5000 });
  const d = data?.daily;

  if (!d) return alerts;

  const wmoCode = d.weather_code?.[0];
  const tempMax = d.temperature_2m_max?.[0];
  const precipProb = d.precipitation_probability_max?.[0];
  const gustMax = d.wind_gusts_10m_max?.[0];
  const uvMax = d.uv_index_max?.[0];

  // Alert da codice WMO
  if (wmoCode && WMO_ALERTS[wmoCode]) {
    alerts.push(WMO_ALERTS[wmoCode]);
  }

  // Alert Afa (caldo estremo)
  if (tempMax != null && tempMax >= 36) {
    alerts.push({
      type: "heat",
      label: `Caldo estremo: max ${tempMax.toFixed(0)}°C`,
      level: "red",
    });
  } else if (tempMax != null && tempMax >= 33) {
    alerts.push({
      type: "heat",
      label: `Allerta afa: max ${tempMax.toFixed(0)}°C`,
      level: "orange",
    });
  } else if (tempMax != null && tempMax >= 30) {
    alerts.push({
      type: "heat",
      label: `Caldo intenso: max ${tempMax.toFixed(0)}°C`,
      level: "yellow",
    });
  }

  // Alert UV
  if (uvMax != null && uvMax >= 11) {
    alerts.push({
      type: "uv",
      label: `UV estremo: indice ${uvMax.toFixed(0)}`,
      level: "red",
    });
  } else if (uvMax != null && uvMax >= 8) {
    alerts.push({
      type: "uv",
      label: `UV molto alto: indice ${uvMax.toFixed(0)}`,
      level: "orange",
    });
  } else if (uvMax != null && uvMax >= 6) {
    alerts.push({
      type: "uv",
      label: `UV alto: indice ${uvMax.toFixed(0)}`,
      level: "yellow",
    });
  }

  // Alert Vento
  if (gustMax != null && gustMax >= 90) {
    alerts.push({
      type: "wind",
      label: `Vento violento: raffiche ${gustMax.toFixed(0)} km/h`,
      level: "red",
    });
  } else if (gustMax != null && gustMax >= 60) {
    alerts.push({
      type: "wind",
      label: `Vento forte: raffiche ${gustMax.toFixed(0)} km/h`,
      level: "orange",
    });
  } else if (gustMax != null && gustMax >= 40) {
    alerts.push({
      type: "wind",
      label: `Vento moderato: raffiche ${gustMax.toFixed(0)} km/h`,
      level: "yellow",
    });
  }

  // Alert pioggia probabilità (se non già coperta da WMO)
  const hasRainAlert = alerts.some(
    (a) => a.type === "rain" || a.type === "storm",
  );
  if (!hasRainAlert && precipProb != null && precipProb >= 80) {
    alerts.push({
      type: "rain",
      label: `Pioggia probabile: ${precipProb}%`,
      level: "yellow",
    });
  }

  return alerts;
}

/**
 * Scarica previsioni da Open-Meteo e restituisce array di alert attivi.
 * La risposta viene cachata per CACHE_TTL_MS per non superare il rate limit.
 * @returns {Promise<Array>} alert[]
 */
export async function fetchAlerts(currentObs) {
  // Restituisci dalla cache se ancora valida
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.alerts;
  }

  // Se c'è già una richiesta in volo, aspetta quella invece di farne un'altra
  if (_pending) return _pending;

  _pending = _fetchFromOpenMeteo(currentObs)
    .then((alerts) => {
      _cache = { alerts, fetchedAt: Date.now() };
      return alerts;
    })
    .catch((err) => {
      console.warn("⚠️  Open-Meteo non raggiungibile, nessun alert:", err.message);
      // Mantieni la cache scaduta se disponibile, altrimenti array vuoto
      return _cache ? _cache.alerts : [];
    })
    .finally(() => {
      _pending = null;
    });

  return _pending;
}
