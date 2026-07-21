// ─────────────────────────────────────────────────────────────────────────────
// openMeteoClient.js
// Interroga la Forecast API gratuita di Open-Meteo (nessuna API key richiesta)
// per un'intera griglia di punti in un'unica chiamata HTTP batch.
//
// Dati richiesti:
//   - minutely_15 "precipitation" (storico recente + adesso) → usato come
//     proxy numerico della precipitazione radar per rilevare e tracciare le
//     celle attive (invece di decodificare pixel di immagini radar, fragile e
//     dipendente da palette colore non documentate).
//   - hourly "cape", "wind_gusts_10m", "freezinglevel_height", "weathercode"
//     → usati per la stima di grandine/raffiche nel punto centrale (stazione).
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Quanti campioni da 15 minuti nel passato richiedere (6 = ultimi 90 minuti),
// sufficienti per stimare direzione/velocità/tendenza della cella tracciata.
const PAST_STEPS_15MIN = 6;

/**
 * Interroga Open-Meteo per l'intera griglia di punti in una sola richiesta
 * (Open-Meteo accetta liste di lat/lon separate da virgola e risponde con un
 * array nello stesso ordine delle coordinate richieste).
 *
 * @param {{lat:number, lon:number}[]} points
 * @returns {Promise<object[]>} un elemento di risposta per ogni punto, stesso ordine di `points`
 */
export async function fetchGridData(points) {
  const latitude = points.map((p) => p.lat.toFixed(4)).join(",");
  const longitude = points.map((p) => p.lon.toFixed(4)).join(",");

  const { data } = await axios.get(BASE_URL, {
    params: {
      latitude,
      longitude,
      minutely_15: "precipitation",
      hourly: "cape,wind_gusts_10m,freezinglevel_height,weathercode",
      past_minutely_15: PAST_STEPS_15MIN,
      forecast_hours: 1,
      timezone: "auto",
    },
    timeout: 15000,
  });

  // Con una sola location Open-Meteo risponde con un oggetto singolo invece
  // che con un array: normalizziamo sempre ad array per uniformità.
  return Array.isArray(data) ? data : [data];
}
