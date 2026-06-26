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
  const url = `${BASE_URL}/current?stationId=${STATION_ID}&format=json&units=m&numericPrecision=decimal&apiKey=${API_KEY}`;
  const { data } = await axios.get(url);
  return data;
}

/**
 * Restituisce tutte le osservazioni del giorno corrente dalla mezzanotte.
 * Usate per calcolare min/max giornalieri.
 * Endpoint: /all/1day
 */
export async function fetchDailyStats() {
  const url = `${BASE_URL}/all/1day?stationId=${STATION_ID}&format=json&units=m&numericPrecision=decimal&apiKey=${API_KEY}`;
  const { data } = await axios.get(url);
  return data;
}

/**
 * Restituisce tutte le osservazioni storiche di una data specifica.
 * @param {string} dateStr - Data in formato YYYYMMDD
 * Endpoint: /v2/pws/history/all
 */
export async function fetchHistoryStats(dateStr) {
  const url = `https://api.weather.com/v2/pws/history/all?stationId=${STATION_ID}&format=json&units=m&numericPrecision=decimal&date=${dateStr}&apiKey=${API_KEY}`;
  const { data } = await axios.get(url);
  return data;
}

/**
 * Restituisce i riepiloghi giornalieri per un intervallo di date (max 31 giorni per chiamata).
 * @param {string} startDate - Data inizio in formato YYYYMMDD
 * @param {string} endDate   - Data fine in formato YYYYMMDD
 * Endpoint: /v2/pws/history/daily
 */
export async function fetchHistoryDaily(startDate, endDate) {
  const url = `https://api.weather.com/v2/pws/history/daily?stationId=${STATION_ID}&format=json&units=m&numericPrecision=decimal&startDate=${startDate}&endDate=${endDate}&apiKey=${API_KEY}`;
  const { data } = await axios.get(url);
  return data;
}
