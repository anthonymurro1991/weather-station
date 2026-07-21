// ─────────────────────────────────────────────────────────────────────────────
// routes/stormtracking.js
// GET /api/stormtracking
//   → Restituisce lo snapshot dello storm tracker custom (cella tracciata più
//     vicina alla stazione, direzione/velocità/ETA, grandine/raffiche stimate).
//   Cache in-memory con TTL = STORM_REFRESH_MINUTES per non sovraccaricare
//   Open-Meteo e restituire l'ultimo dato valido in caso di errore momentaneo.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { getStormTrackingSnapshot } from "../stormTracking/stormTrackingService.js";
import { STORM_REFRESH_MINUTES } from "../config.js";

const router = Router();

let cache = null; // { data, ts }
const CACHE_TTL_MS = STORM_REFRESH_MINUTES * 60 * 1000;

router.get("/", async (req, res) => {
  const now = Date.now();

  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return res.json(cache.data);
  }

  try {
    const data = await getStormTrackingSnapshot();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error("[stormtracking] errore:", err.message);
    if (cache) {
      // Errore momentaneo (es. Open-Meteo non raggiungibile): restituisci
      // l'ultimo dato valido disponibile invece di rompere il frontend.
      return res.json({ ...cache.data, stale: true });
    }
    res.status(502).json({
      error: "Bad Gateway",
      message: "Impossibile recuperare i dati storm tracking",
    });
  }
});

export default router;
