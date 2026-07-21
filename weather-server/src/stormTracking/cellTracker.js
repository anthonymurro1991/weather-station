// ─────────────────────────────────────────────────────────────────────────────
// cellTracker.js
// Traccia nel tempo la cella di precipitazione più vicina a un punto di
// interesse (la stazione), confrontando i cluster rilevati in frame successivi
// (ogni 15 minuti) per stimare:
//   - distanza e direzione dalla stazione
//   - direzione e velocità di moto della cella
//   - tendenza (in intensificazione / stazionaria / in indebolimento)
//   - tempo stimato di arrivo (ETA), tramite proiezione lineare del moto
// ─────────────────────────────────────────────────────────────────────────────

import { haversineKm, bearingDeg, compassPoint } from "./geoGrid.js";

const MAX_MATCH_JUMP_KM = 40; // spostamento massimo plausibile tra due frame da 15min
const ARRIVAL_THRESHOLD_KM = 15; // sotto questa distanza si considera "in arrivo"
const PROJECTION_MAX_MINUTES = 180;
const PROJECTION_STEP_MINUTES = 5;
const KM_PER_DEG_LAT = 111.32;

/** Trova, in una lista di celle, quella più vicina a un punto di riferimento. */
function findNearestCell(cells, lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const cell of cells) {
    const d = haversineKm(lat, lon, cell.centroidLat, cell.centroidLon);
    if (d < bestDist) {
      bestDist = d;
      best = cell;
    }
  }
  return best ? { cell: best, distanceKm: bestDist } : null;
}

/**
 * @param {Array<Array<object>>} framesCells  cluster rilevati per ciascun frame, dal più vecchio a "adesso"
 * @param {number[]} frameMinutesAgo  minuti fa di ciascun frame (stesso ordine; 0 = adesso)
 * @param {number} homeLat
 * @param {number} homeLon
 * @returns {object|null} null se nessuna cella attiva è rilevata nel frame attuale
 */
export function trackPrimaryCell(
  framesCells,
  frameMinutesAgo,
  homeLat,
  homeLon,
) {
  const lastIdx = framesCells.length - 1;
  const currentFrame = framesCells[lastIdx];
  if (!currentFrame || currentFrame.length === 0) return null;

  // La cella "di interesse" è la più vicina alla stazione nel frame attuale
  const nearestNow = findNearestCell(currentFrame, homeLat, homeLon);
  if (!nearestNow) return null;

  // Risali all'indietro nei frame precedenti agganciando la cella più vicina
  // (entro uno spostamento plausibile) per costruire una traccia di posizioni.
  const track = [{ ...nearestNow.cell, minutesAgo: frameMinutesAgo[lastIdx] }];
  let refLat = nearestNow.cell.centroidLat;
  let refLon = nearestNow.cell.centroidLon;

  for (let i = lastIdx - 1; i >= 0; i--) {
    const match = findNearestCell(framesCells[i], refLat, refLon);
    if (!match || match.distanceKm > MAX_MATCH_JUMP_KM) break;
    track.unshift({ ...match.cell, minutesAgo: frameMinutesAgo[i] });
    refLat = match.cell.centroidLat;
    refLon = match.cell.centroidLon;
  }

  const distanceKm = nearestNow.distanceKm;
  const directionFromHomeDeg = bearingDeg(
    homeLat,
    homeLon,
    nearestNow.cell.centroidLat,
    nearestNow.cell.centroidLon,
  );

  let speedKmh = null;
  let movingTowardDeg = null;
  let trend = "dati insufficienti";
  let etaMinutes = null;
  let closestApproachKm = distanceKm;
  let closestApproachMinutes = 0;

  if (track.length >= 2) {
    const oldest = track[0];
    const newest = track[track.length - 1];
    const elapsedMinutes = oldest.minutesAgo - newest.minutesAgo;
    const displacementKm = haversineKm(
      oldest.centroidLat,
      oldest.centroidLon,
      newest.centroidLat,
      newest.centroidLon,
    );

    if (elapsedMinutes > 0) {
      speedKmh = (displacementKm / elapsedMinutes) * 60;
      movingTowardDeg = bearingDeg(
        oldest.centroidLat,
        oldest.centroidLon,
        newest.centroidLat,
        newest.centroidLon,
      );
    }

    // Tendenza: confronta l'intensità massima del frame più vecchio con quella più recente
    const ratio =
      oldest.maxIntensityMm > 0
        ? newest.maxIntensityMm / oldest.maxIntensityMm
        : newest.maxIntensityMm > 0
          ? 2
          : 1;
    if (ratio > 1.15) trend = "in intensificazione";
    else if (ratio < 0.85) trend = "in indebolimento";
    else trend = "stazionaria";

    // Proiezione lineare del moto per stimare l'avvicinamento alla stazione
    if (speedKmh != null && speedKmh > 1) {
      const speedKmPerMin = speedKmh / 60;
      const dirRad = (movingTowardDeg * Math.PI) / 180;
      const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((homeLat * Math.PI) / 180);

      for (
        let t = 0;
        t <= PROJECTION_MAX_MINUTES;
        t += PROJECTION_STEP_MINUTES
      ) {
        const distTraveled = speedKmPerMin * t;
        const dLat = (distTraveled * Math.cos(dirRad)) / KM_PER_DEG_LAT;
        const dLon = (distTraveled * Math.sin(dirRad)) / kmPerDegLon;
        const projLat = newest.centroidLat + dLat;
        const projLon = newest.centroidLon + dLon;
        const d = haversineKm(homeLat, homeLon, projLat, projLon);

        if (d < closestApproachKm) {
          closestApproachKm = d;
          closestApproachMinutes = t;
        }
        if (d <= ARRIVAL_THRESHOLD_KM && etaMinutes == null) {
          etaMinutes = t;
        }
      }
    }
  }

  return {
    distanceKm,
    directionFromHomeDeg,
    directionFromHomeCompass: compassPoint(directionFromHomeDeg),
    centroidLat: nearestNow.cell.centroidLat,
    centroidLon: nearestNow.cell.centroidLon,
    speedKmh,
    movingTowardDeg,
    movingTowardCompass:
      movingTowardDeg != null ? compassPoint(movingTowardDeg) : null,
    trend,
    maxIntensityMm: nearestNow.cell.maxIntensityMm,
    etaMinutes,
    closestApproachKm,
    closestApproachMinutes,
    trackedFrames: track.length,
  };
}
