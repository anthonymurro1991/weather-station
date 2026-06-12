// ─────────────────────────────────────────────────────────────────────────────
// routes/weather.js
// Definisce le route HTTP dell'API meteo.
//
// GET /api/weather/all
//   → Chiama Weather.com in parallelo (dati correnti + 24h),
//     calcola le statistiche min/max e risponde col JSON unificato.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { fetchCurrentWeather, fetchDailyStats } from "../weatherApi.js";
import { computeStats } from "../statsCalculator.js";
import { computeTrend, computeRainProbability } from "../trendCalculator.js";
import { classifyFromDescription } from "../conditionClassifier.js";
import { getWeatherDescription } from "../descriptionCalculator.js";
import {
  getIconName,
  getBackgroundClass,
  getFaviconName,
} from "../iconCalculator.js";

const router = Router();

router.get("/all", async (req, res) => {
  try {
    // Esegui le due chiamate a Weather.com in parallelo per ridurre la latenza
    const [currentData, statsData] = await Promise.all([
      fetchCurrentWeather(),
      fetchDailyStats(),
    ]);

    const observations = statsData.observations || [];
    console.log(`\nOsservazioni giornaliere ricevute: ${observations.length}`);

    const currentObs = currentData.observations?.[0] ?? null;

    // Calcola min/max giornalieri dalle osservazioni storiche
    const stats = computeStats(currentObs, observations);
    const { forecastText, pressureTrend, humidityTrend } =
      computeTrend(observations);
    const rainProbability = computeRainProbability(
      pressureTrend,
      humidityTrend,
      observations,
      currentObs,
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
    );

    // Deriva la categoria dalla descrizione — garantisce allineamento icona/sfondo/favicon
    const category = classifyFromDescription(description);

    const iconName = getIconName(category);
    const backgroundClass = getBackgroundClass(category, metric.temp);
    const faviconName = getFaviconName(category, metric.temp);

    res.json({
      current: currentData,
      stats,
      description,
      trend: forecastText,
      pressureTrend,
      rainProbability,
      iconName,
      backgroundClass,
      faviconName,
    });
  } catch (err) {
    console.error("Errore nel fetch dei dati meteo:", err.message);
    res.status(500).json({
      error: "Failed to fetch unified weather data",
      details: err.message,
    });
  }
});

export default router;
