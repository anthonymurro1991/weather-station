// ─────────────────────────────────────────────────────────────────────────────
// routes/airquality.js
// GET /api/airquality
//   → Restituisce l'European AQI e i principali inquinanti (PM2.5, PM10,
//     NO2, O3, SO2, CO) nel punto della stazione, da Open-Meteo Air Quality.
//   Cache in-memory con TTL = AIR_QUALITY_REFRESH_MINUTES: la qualità
//   dell'aria cambia lentamente, non serve interrogare l'API ogni pochi
//   minuti come per lo storm tracker.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { getAirQualitySnapshot } from "../airQuality/airQualityService.js";
import { AIR_QUALITY_REFRESH_MINUTES } from "../config.js";

const router = Router();

let cache = null; // { data, ts }
const CACHE_TTL_MS = AIR_QUALITY_REFRESH_MINUTES * 60 * 1000;

router.get("/", async (req, res) => {
  const now = Date.now();

  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return res.json(cache.data);
  }

  try {
    const data = await getAirQualitySnapshot();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error("[airquality] errore:", err.message);
    if (cache) {
      return res.json({ ...cache.data, stale: true });
    }
    res.status(502).json({
      error: "Bad Gateway",
      message: "Impossibile recuperare i dati di qualità dell'aria",
    });
  }
});

export default router;
