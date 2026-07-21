// ─────────────────────────────────────────────────────────────────────────────
// cellDetector.js
// Rileva le "celle" di precipitazione attiva in un singolo istante: raggruppa
// per contiguità (connected-component labeling, BFS a 8 vicini) i punti della
// griglia la cui intensità di precipitazione supera una soglia minima.
//
// Nota: la risoluzione dipende dalla spaziatura della griglia (tipicamente
// 15-20km), quindi rappresenta "aree di precipitazione attiva" più che singole
// celle temporalesche in senso radar stretto — un compromesso deliberato per
// avere un dato numerico affidabile invece di decodificare immagini radar.
// ─────────────────────────────────────────────────────────────────────────────

// Soglia minima di precipitazione (mm/15min) per considerare un punto "attivo".
// 0.3mm/15min ≈ 1.2mm/h: pioggia da debole a moderata.
export const ACTIVE_THRESHOLD_MM = 0.3;

/**
 * @param {Array<{row:number, col:number, lat:number, lon:number}>} gridPoints
 * @param {number} gridSize
 * @param {Map<string, number>} intensityByKey  chiave "row,col" → mm di pioggia nel frame
 * @returns {Array<object>} celle rilevate, ordinate per intensità massima decrescente
 */
export function detectCells(gridPoints, gridSize, intensityByKey) {
  const key = (r, c) => `${r},${c}`;
  const pointByKey = new Map(gridPoints.map((p) => [key(p.row, p.col), p]));
  const visited = new Set();
  const cells = [];

  for (const point of gridPoints) {
    const k = key(point.row, point.col);
    if (visited.has(k)) continue;
    const intensity = intensityByKey.get(k) || 0;
    if (intensity < ACTIVE_THRESHOLD_MM) continue;

    // BFS: raggruppa tutti i punti attivi contigui (8 vicini)
    const clusterPoints = [];
    const queue = [point];
    visited.add(k);
    while (queue.length) {
      const cur = queue.shift();
      const curIntensity = intensityByKey.get(key(cur.row, cur.col)) || 0;
      clusterPoints.push({ ...cur, intensity: curIntensity });

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = cur.row + dr;
          const nc = cur.col + dc;
          if (nr < 0 || nc < 0 || nr >= gridSize || nc >= gridSize) continue;
          const nk = key(nr, nc);
          if (visited.has(nk)) continue;
          const nIntensity = intensityByKey.get(nk) || 0;
          if (nIntensity < ACTIVE_THRESHOLD_MM) continue;
          visited.add(nk);
          queue.push(pointByKey.get(nk));
        }
      }
    }

    // Centroide pesato sull'intensità di precipitazione
    let sumW = 0;
    let sumLat = 0;
    let sumLon = 0;
    let maxIntensity = 0;
    for (const cp of clusterPoints) {
      sumW += cp.intensity;
      sumLat += cp.lat * cp.intensity;
      sumLon += cp.lon * cp.intensity;
      if (cp.intensity > maxIntensity) maxIntensity = cp.intensity;
    }
    const centroidLat = sumW > 0 ? sumLat / sumW : clusterPoints[0].lat;
    const centroidLon = sumW > 0 ? sumLon / sumW : clusterPoints[0].lon;

    cells.push({
      centroidLat,
      centroidLon,
      maxIntensityMm: maxIntensity,
      avgIntensityMm: sumW / clusterPoints.length,
      areaPoints: clusterPoints.length,
    });
  }

  return cells.sort((a, b) => b.maxIntensityMm - a.maxIntensityMm);
}
