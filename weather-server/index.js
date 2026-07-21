// ─────────────────────────────────────────────────────────────────────────────
// index.js  ←  ENTRY POINT
// Avvia il server Express, applica i middleware globali (CORS) e monta le route.
//
// Struttura del progetto:
//   src/config.js            → porta, API key, ID stazione, opzioni CORS
//   src/weatherApi.js        → chiamate HTTP a Weather.com
//   src/statsCalculator.js   → calcolo min/max giornalieri dalle osservazioni
//   src/routes/weather.js    → route GET /api/weather/all
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import cors from "cors";
import { PORT, STATION_ID, corsOptions } from "./src/config.js";
import weatherRouter from "./src/routes/weather.js";
import stormtrackingRouter from "./src/routes/stormtracking.js";

const app = express();

// Middleware globale CORS
app.use(cors(corsOptions));

// Route API meteo
app.use("/api/weather", weatherRouter);
app.use("/api/stormtracking", stormtrackingRouter);

// Health check – verifica che il server sia attivo
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Meteo Murro API Server",
    endpoints: {
      unified: "/api/weather/all",
      stormtracking: "/api/stormtracking",
    },
    version: "1.0.0",
  });
});

// Gestione 404
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "L'endpoint richiesto non esiste",
  });
});

app.listen(PORT, () => {});
