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
import { getIconName, getBackgroundClass } from "../iconCalculator.js";

const router = Router();

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
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch unified weather data",
      details: err.message,
    });
  }
});

export default router;
