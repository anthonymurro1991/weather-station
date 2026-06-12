// ─────────────────────────────────────────────────────────────────────────────
// weatherApi.js
// Funzioni che parlano direttamente con l'API di Weather.com (Weather Underground).
// Due chiamate distinte:
//   - fetchCurrentWeather()  → osservazione istantanea corrente della stazione
//   - fetchDailyStats()      → tutte le osservazioni delle ultime 24 ore
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import { STATION_ID, API_KEY } from "./config.js";

const BASE_URL = "https://api.weather.com/v2/pws/observations";

/**
 * Restituisce l'osservazione corrente della stazione (snapshot istantaneo).
 * Endpoint: /current
 */
export async function fetchCurrentWeather() {
  const url = `${BASE_URL}/current?stationId=${STATION_ID}&format=json&units=m&apiKey=${API_KEY}`;
  console.log("\nFetching current weather from Weather.com...");
  const { data } = await axios.get(url);
  return data;
}

/**
 * Restituisce tutte le osservazioni delle ultime 24 ore (una ogni ~5 min).
 * Usate per calcolare min/max giornalieri.
 * Endpoint: /all/1day
 */
export async function fetchDailyStats() {
  const url = `${BASE_URL}/all/1day?stationId=${STATION_ID}&format=json&units=m&apiKey=${API_KEY}`;
  console.log("\nFetching daily observations from Weather.com...");
  const { data } = await axios.get(url);
  return data;
}
