// ─────────────────────────────────────────────────────────────────────────────
// routes/weather.js
// Definisce le route HTTP dell'API meteo.
//
// GET /api/weather/all
//   → Chiama Weather.com in parallelo (dati correnti + 24h),
//     calcola le statistiche min/max e risponde col JSON unificato.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import {
  fetchCurrentWeather,
  fetchDailyStats,
  fetchHistoryDaily,
} from "../weatherApi.js";
import { computeStats } from "../statsCalculator.js";
import { computeTrend, computeRainProbability } from "../trendCalculator.js";
import { classifyFromDescription } from "../conditionClassifier.js";
import { getWeatherDescription } from "../descriptionCalculator.js";
import { getIconName, getBackgroundClass } from "../iconCalculator.js";
import { getSunTimes, getMoonPhase } from "../solarCalculator.js";
import { fetchAlerts } from "../alertCalculator.js";

const router = Router();

// ── Cache in-memory per statistiche annuali (TTL 6 ore) ──────────────────────
const yearlyStatsCache = new Map();
const YEARLY_CACHE_TTL = 2 * 24 * 60 * 60 * 1000;

/** Formatta un oggetto Date come stringa YYYYMMDD */
function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Suddivide l'intervallo [Jan 1, endDate] in chunk da ≤31 giorni.
 * @param {number} year
 * @returns {{ start: string, end: string }[]}
 */
function buildYearChunks(year) {
  const chunks = [];
  const today = new Date();
  const rangeEnd = new Date(
    Math.min(new Date(year, 11, 31).getTime(), today.getTime()),
  );
  let cursor = new Date(year, 0, 1);
  while (cursor <= rangeEnd) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + 30); // 31 giorni inclusivi
    if (chunkEnd > rangeEnd) chunkEnd.setTime(rangeEnd.getTime());
    chunks.push({ start: fmtDate(cursor), end: fmtDate(chunkEnd) });
    cursor = new Date(chunkEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return chunks;
}

async function getYearlyStats(year) {
  const key = String(year);
  const now = Date.now();
  const cached = yearlyStatsCache.get(key);
  if (cached && now - cached.ts < YEARLY_CACHE_TTL) return cached.data;

  const chunks = buildYearChunks(year);
  const allObs = [];

  // Richieste sequenziali per evitare rate-limit (max 31 giorni per chiamata)
  for (let i = 0; i < chunks.length; i++) {
    const { start, end } = chunks[i];
    const result = await fetchHistoryDaily(start, end).catch((e) => {
      console.error(
        `[yearly] ${year} chunk ${start}-${end} error:`,
        e.response?.status,
        e.message,
      );
      return null;
    });
    if (result?.observations) allObs.push(...result.observations);
    if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 300));
  }

  let tempMax = null,
    tempMaxDate = null;
  let tempMin = null,
    tempMinDate = null;
  let windMax = null,
    windMaxDate = null;
  let windGustMax = null,
    windGustMaxDate = null;
  let rainMax = null,
    rainMaxDate = null;

  for (const obs of allObs) {
    const m = obs.metric || {};
    const d = (obs.obsTimeLocal || obs.obsTimeUtc || "").slice(0, 16);
    // /history/daily restituisce già riepiloghi giornalieri con High/Low
    if (m.tempHigh != null && (tempMax == null || m.tempHigh > tempMax)) {
      tempMax = m.tempHigh;
      tempMaxDate = d;
    }
    if (m.tempLow != null && (tempMin == null || m.tempLow < tempMin)) {
      tempMin = m.tempLow;
      tempMinDate = d;
    }
    if (
      m.windspeedHigh != null &&
      (windMax == null || m.windspeedHigh > windMax)
    ) {
      windMax = m.windspeedHigh;
      windMaxDate = d;
    }
    if (
      m.windgustHigh != null &&
      (windGustMax == null || m.windgustHigh > windGustMax)
    ) {
      windGustMax = m.windgustHigh;
      windGustMaxDate = d;
    }
    // precipTotal nel daily è già il totale del giorno
    if (m.precipTotal != null && (rainMax == null || m.precipTotal > rainMax)) {
      rainMax = m.precipTotal;
      rainMaxDate = d;
    }
  }

  const data = {
    year,
    tempMax,
    tempMaxDate,
    tempMin,
    tempMinDate,
    windMax,
    windMaxDate,
    windGustMax,
    windGustMaxDate,
    rainMax,
    rainMaxDate,
  };
  yearlyStatsCache.set(key, { data, ts: now });
  return data;
}

router.get("/all", async (req, res) => {
  try {
    // Esegui le due chiamate a Weather.com in parallelo per ridurre la latenza
    const [currentData, statsData] = await Promise.all([
      fetchCurrentWeather(),
      fetchDailyStats(),
    ]);

    const observations = statsData.observations || [];
    const currentObs = currentData.observations?.[0] ?? null;

    // Calcola min/max giornalieri dalle osservazioni storiche
    const stats = computeStats(currentObs, observations);
    const { forecastText, pressureTrend, humidityTrend, pressureDelta3h } =
      computeTrend(observations);
    const {
      probability: rainProbability,
      probability3h: rainProbability3h,
      probability12h: rainProbability12h,
    } = computeRainProbability(
      pressureTrend,
      humidityTrend,
      observations,
      currentObs,
      pressureDelta3h,
    );

    // Calcola la descrizione testuale (logica principale — dati grezzi)
    const metric = currentObs?.metric || {};
    const humidity = currentObs?.humidity ?? metric.humidity;

    const description = getWeatherDescription(
      metric.pressure,
      metric.temp,
      humidity,
      metric.dewpt,
      metric.precipRate,
      pressureDelta3h,
    );

    // Deriva la categoria dalla descrizione — garantisce allineamento icona/sfondo/favicon
    const category = classifyFromDescription(description);

    const iconName = getIconName(category);
    const backgroundClass = getBackgroundClass(category, metric.temp);
    const solar = { ...getSunTimes(), ...getMoonPhase() };
    const alerts = await fetchAlerts(currentObs);

    // Comprimi le osservazioni di pressione per la sparkline (time + valore)
    const pressureHistory = observations
      .map((o) => ({
        t: o.obsTimeLocal,
        p: o.metric?.pressureMax ?? o.metric?.pressureMin ?? null,
      }))
      .filter((o) => o.p != null);

    const humidityHistory = observations
      .map((o) => {
        const high = o.humidityHigh ?? null;
        const low = o.humidityLow ?? null;
        const h =
          high != null && low != null
            ? Math.round((high + low) / 2)
            : (high ?? low ?? o.humidity ?? null);
        return { t: o.obsTimeLocal, h };
      })
      .filter((o) => o.h != null);

    res.json({
      current: currentData,
      stats,
      description,
      trend: forecastText,
      pressureTrend,
      rainProbability,
      rainProbability3h,
      rainProbability12h,
      pressureHistory,
      humidityHistory,
      iconName,
      backgroundClass,
      solar,
      alerts,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch unified weather data",
      details: err.message,
    });
  }
});

// ── GET /api/weather/yearly-stats ────────────────────────────────────────────
router.get("/yearly-stats", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    const years = await Promise.all(
      Array.from({ length: currentYear - startYear + 1 }, (_, i) =>
        getYearlyStats(startYear + i),
      ),
    );
    // Invia solo anni che hanno almeno un dato
    res.json({
      years: years.filter(
        (y) => y.tempMax != null || y.tempMin != null || y.rainMax != null,
      ),
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch yearly stats", details: err.message });
  }
});

export default router;
