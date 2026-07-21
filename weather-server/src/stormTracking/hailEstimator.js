// ─────────────────────────────────────────────────────────────────────────────
// hailEstimator.js
// Stima EURISTICA (non una rilevazione radar reale di grandine) del rischio
// grandine e classificazione del CAPE, basata su:
//   - codice meteo WMO orario (95 = temporale, 96 = temporale con grandine
//     debole, 99 = temporale con grandine forte)
//   - CAPE (energia potenziale convettiva disponibile, J/kg)
//   - quota dello zero termico (freezing level): più è bassa, più è probabile
//     che la grandine raggiunga il suolo senza sciogliersi
// ─────────────────────────────────────────────────────────────────────────────

export function classifyCape(capeJkg) {
  if (capeJkg == null) return "N/D";
  if (capeJkg < 500) return "debole";
  if (capeJkg < 1500) return "moderato";
  if (capeJkg < 2500) return "forte";
  return "estremo";
}

/**
 * @param {{weathercode:number|null, capeJkg:number|null, freezingLevelM:number|null}} params
 * @returns {{risk:string, size:string|null}}
 */
export function estimateHailRisk({ weathercode, capeJkg, freezingLevelM }) {
  const cape = capeJkg ?? 0;
  const freezingLevel = freezingLevelM ?? 4000;

  if (weathercode === 99) {
    return freezingLevel < 3500 && cape > 2000
      ? { risk: "probabile", size: "grande possibile" }
      : { risk: "probabile", size: "piccola/media possibile" };
  }
  if (weathercode === 96) {
    return cape > 2000 && freezingLevel < 3500
      ? { risk: "possibile", size: "media possibile" }
      : { risk: "possibile", size: "piccola possibile" };
  }
  if (weathercode === 95 && cape > 1500) {
    return { risk: "non esclusa", size: null };
  }
  return { risk: "nessuna", size: null };
}
