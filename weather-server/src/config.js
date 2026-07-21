// ─────────────────────────────────────────────────────────────────────────────
// config.js
// Tutte le costanti di configurazione del server: porta, credenziali API, CORS.
// Le variabili sensibili vengono lette dal file .env tramite dotenv.
// ─────────────────────────────────────────────────────────────────────────────

import * as dotenv from "dotenv";
dotenv.config();

// Porta su cui ascolta il server Express
export const PORT = process.env.PORT || 4000;

// ID della stazione meteo personale su Weather.com
export const STATION_ID = process.env.STATION_ID || "IBARIA12";

// Chiave API per Weather.com (Weather Underground PWS)
export const API_KEY =
  process.env.WEATHER_API_KEY || "8b1e015fdac04f1b9e015fdac09f1b40";

// Coordinate della stazione, usate dal modulo storm tracking (config.js frontend
// ha gli stessi valori di default in REACT_APP_STATION_LAT/LON per il radar Windy)
export const STATION_LAT = parseFloat(process.env.STATION_LAT) || 45.504;
export const STATION_LON = parseFloat(process.env.STATION_LON) || 9.712;

// Storm tracking: raggio di monitoraggio, risoluzione griglia e frequenza aggiornamento
export const STORM_RADIUS_KM = parseFloat(process.env.STORM_RADIUS_KM) || 50;
export const STORM_GRID_SIZE = parseInt(process.env.STORM_GRID_SIZE, 10) || 7;
export const STORM_REFRESH_MINUTES =
  parseFloat(process.env.STORM_REFRESH_MINUTES) || 2;

// Opzioni CORS: in produzione accetta solo il dominio del frontend deployato
export const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://weather-frontend-9bsl.vercel.app"]
      : "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
