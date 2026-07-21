// ─────────────────────────────────────────────────────────────────────────────
// geoGrid.js
// Utility geografiche condivise dal modulo storm tracking: distanza (haversine),
// rotta/bearing tra due punti, punto cardinale e generazione della griglia di
// coordinate attorno a un centro (usata per campionare Open-Meteo).
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEG_LAT = 111.32;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/** Distanza in km tra due coordinate (formula haversine). */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Rotta iniziale (bearing, 0-360°) dal punto 1 al punto 2. */
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1));
  return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
}

/** Converte un bearing (gradi) nel punto cardinale italiano più vicino (N/NE/E/SE/S/SO/O/NO). */
export function compassPoint(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Genera una griglia quadrata gridSize×gridSize di punti lat/lon centrata su
 * (centerLat, centerLon), che copre da -radiusKm a +radiusKm su entrambi gli
 * assi. Il punto centrale della griglia coincide esattamente con il centro.
 *
 * @returns {Array<{row:number, col:number, lat:number, lon:number, distanceFromCenterKm:number}>}
 */
export function buildGrid(centerLat, centerLon, radiusKm, gridSize) {
  const stepKm = (2 * radiusKm) / (gridSize - 1);
  const kmPerDegLon = KM_PER_DEG_LAT * Math.cos(toRad(centerLat));
  const half = (gridSize - 1) / 2;

  const points = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const dLatKm = (row - half) * stepKm;
      const dLonKm = (col - half) * stepKm;
      const lat = centerLat + dLatKm / KM_PER_DEG_LAT;
      const lon = centerLon + dLonKm / kmPerDegLon;
      points.push({
        row,
        col,
        lat,
        lon,
        distanceFromCenterKm: haversineKm(centerLat, centerLon, lat, lon),
      });
    }
  }
  return points;
}
