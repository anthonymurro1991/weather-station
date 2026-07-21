// ─────────────────────────────────────────────────────────────────────────────
// airQualityService.js
// Interroga la Air Quality API gratuita di Open-Meteo (nessuna API key
// richiesta) per ottenere l'indice europeo di qualità dell'aria (European
// AQI) e i principali inquinanti nel punto della stazione.
//
// European AQI, fasce ufficiali (CAMS/EEA):
//   0-20 Buona · 20-40 Discreta · 40-60 Scadente · 60-80 Cattiva ·
//   80-100 Molto cattiva · >100 Estremamente cattiva
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import { STATION_LAT, STATION_LON } from "../config.js";

const BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const AQI_BANDS = [
  { max: 20, label: "Buona", level: "ok" },
  { max: 40, label: "Discreta", level: "watch" },
  { max: 60, label: "Scadente", level: "watch" },
  { max: 80, label: "Cattiva", level: "warning" },
  { max: 100, label: "Molto cattiva", level: "severe" },
  { max: Infinity, label: "Estremamente cattiva", level: "severe" },
];

function classifyAqi(aqi) {
  if (aqi == null) return { label: "N/D", level: "ok" };
  const band = AQI_BANDS.find((b) => aqi <= b.max);
  return { label: band.label, level: band.level };
}

/** Trova l'indice del timestamp "hourly" più vicino all'istante attuale. */
function findNowIndex(times) {
  const now = Date.now();
  let bestIdx = 0;
  let bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export async function getAirQualitySnapshot() {
  const { data } = await axios.get(BASE_URL, {
    params: {
      latitude: STATION_LAT,
      longitude: STATION_LON,
      hourly:
        "pm10,pm2_5,european_aqi,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide",
      forecast_hours: 1,
      timezone: "auto",
    },
    timeout: 15000,
  });

  const times = data?.hourly?.time || [];
  const idx = findNowIndex(times);

  const aqi = data?.hourly?.european_aqi?.[idx] ?? null;
  const pm25 = data?.hourly?.pm2_5?.[idx] ?? null;
  const pm10 = data?.hourly?.pm10?.[idx] ?? null;
  const no2 = data?.hourly?.nitrogen_dioxide?.[idx] ?? null;
  const o3 = data?.hourly?.ozone?.[idx] ?? null;
  const so2 = data?.hourly?.sulphur_dioxide?.[idx] ?? null;
  const co = data?.hourly?.carbon_monoxide?.[idx] ?? null;

  return {
    updatedAt: new Date().toISOString(),
    aqi,
    status: classifyAqi(aqi),
    pm25,
    pm10,
    no2,
    o3,
    so2,
    co,
  };
}
