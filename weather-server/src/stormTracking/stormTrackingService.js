// ─────────────────────────────────────────────────────────────────────────────
// stormTrackingService.js
// Orchestratore dello "storm tracker" custom (radar + tracking celle).
//
// Flusso:
//   1. Costruisce una griglia di punti attorno alla stazione (buildGrid).
//   2. Interroga Open-Meteo una sola volta per l'intera griglia (fetchGridData):
//      precipitazione ogni 15 min (storico recente + adesso) + CAPE/raffiche/
//      zero termico/codice meteo orari nel punto centrale.
//   3. Per ogni frame passato rileva le celle di precipitazione attiva
//      (detectCells) e le traccia nel tempo (trackPrimaryCell) per stimare
//      direzione, velocità, tendenza ed ETA rispetto alla stazione.
//   4. Stima grandine/raffiche (hailEstimator) e compone la risposta finale.
//
// LIMITI NOTI (dichiarati esplicitamente, non nascosti):
//   - Grandine è una stima euristica da CAPE/codice meteo/zero termico, non
//     una rilevazione radar diretta. Le raffiche invece sono il forecast
//     orario di Open-Meteo (wind_gusts_10m), preso così com'è.
//   - I fulmini non sono inclusi: nessuna fonte gratuita ufficiale affidabile
//     era disponibile, quindi il campo è stato rimosso invece di mostrare un
//     placeholder sempre vuoto.
//   - Le "celle" derivano da un campionamento a griglia (Open-Meteo), non da
//     riflettività radar pixel-per-pixel: risoluzione tipica 15-20km.
// ─────────────────────────────────────────────────────────────────────────────

import {
  STATION_LAT,
  STATION_LON,
  STORM_RADIUS_KM,
  STORM_GRID_SIZE,
  STORM_REFRESH_MINUTES,
} from "../config.js";
import { buildGrid } from "./geoGrid.js";
import { fetchGridData } from "./openMeteoClient.js";
import { detectCells } from "./cellDetector.js";
import { trackPrimaryCell } from "./cellTracker.js";
import { classifyCape, estimateHailRisk } from "./hailEstimator.js";

/** Trova l'indice del timestamp minutely_15 più vicino all'istante attuale. */
function findNowIndex(times) {
  const now = Date.now();
  let bestIdx = 0;
  let bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/** Trova l'indice dell'orario "hourly" più vicino all'istante attuale. */
function findNearestHourIndex(times) {
  if (!times.length) return 0;
  return findNowIndex(times);
}

function buildStatus({ cellInfo, hail }) {
  if (!cellInfo) return { level: "ok", label: "TUTTO OK" };

  if (
    hail.risk === "probabile" ||
    (cellInfo.etaMinutes != null && cellInfo.etaMinutes <= 20)
  ) {
    return { level: "severe", label: "ALLERTA TEMPORALE" };
  }
  if (cellInfo.etaMinutes != null || cellInfo.distanceKm <= 15) {
    return { level: "warning", label: "TEMPORALE IN AVVICINAMENTO" };
  }
  return { level: "watch", label: "CELLA RILEVATA IN AREA" };
}

export async function getStormTrackingSnapshot() {
  const gridPoints = buildGrid(
    STATION_LAT,
    STATION_LON,
    STORM_RADIUS_KM,
    STORM_GRID_SIZE,
  );

  const gridResults = await fetchGridData(gridPoints);

  // I timestamp minutely_15 sono comuni a tutta la griglia (stessa richiesta)
  const times = gridResults[0]?.minutely_15?.time || [];
  const nowIndex = findNowIndex(times);

  // Rileva le celle per ciascun frame "osservato", dal più vecchio ad "adesso"
  const framesCells = [];
  const frameMinutesAgo = [];
  for (let t = 0; t <= nowIndex; t++) {
    const intensityByKey = new Map();
    gridPoints.forEach((p, idx) => {
      const val = gridResults[idx]?.minutely_15?.precipitation?.[t] ?? 0;
      intensityByKey.set(`${p.row},${p.col}`, val);
    });
    framesCells.push(detectCells(gridPoints, STORM_GRID_SIZE, intensityByKey));
    frameMinutesAgo.push((nowIndex - t) * 15);
  }

  const cellInfo = trackPrimaryCell(
    framesCells,
    frameMinutesAgo,
    STATION_LAT,
    STATION_LON,
  );

  // Il punto centrale della griglia coincide con la stazione (vedi buildGrid)
  const half = Math.floor(STORM_GRID_SIZE / 2);
  const centerIdx = gridPoints.findIndex(
    (p) => p.row === half && p.col === half,
  );
  const centerData = gridResults[centerIdx] ?? gridResults[0];

  const hourlyTimes = centerData?.hourly?.time || [];
  const hourIdx = findNearestHourIndex(hourlyTimes);

  const capeJkg = centerData?.hourly?.cape?.[hourIdx] ?? null;
  const gustKmh = centerData?.hourly?.wind_gusts_10m?.[hourIdx] ?? null;
  const freezingLevelM =
    centerData?.hourly?.freezinglevel_height?.[hourIdx] ?? null;
  const weathercode = centerData?.hourly?.weathercode?.[hourIdx] ?? null;

  const hail = estimateHailRisk({ weathercode, capeJkg, freezingLevelM });
  const status = buildStatus({ cellInfo, hail });

  return {
    center: { lat: STATION_LAT, lon: STATION_LON },
    radiusKm: STORM_RADIUS_KM,
    updatedAt: new Date().toISOString(),
    refreshIntervalMinutes: STORM_REFRESH_MINUTES,
    status,
    situazione: cellInfo ? "Cella di precipitazione rilevata" : "Nessuna cella",
    cell: cellInfo,
    hail: { ...hail, capeCategory: classifyCape(capeJkg) },
    estimatedGustKmh: gustKmh,
    capeJkg,
    freezingLevelM,
  };
}
