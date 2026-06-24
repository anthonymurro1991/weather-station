// ─────────────────────────────────────────────────────────────────────────────
// solarCalculator.js
// Calcola alba, tramonto e fase lunare per la stazione di Bariano (BG).
// Algoritmo NOAA semplificato — nessuna dipendenza esterna.
// ─────────────────────────────────────────────────────────────────────────────

const LAT = 45.5052; // Bariano, BG
const LON = 9.7024;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Converte un Julian Day Number in ora locale "HH:MM" per Europe/Rome.
 */
function jdToLocalTime(jd) {
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

/**
 * Calcola alba e tramonto per una data.
 * @param {Date} date
 * @returns {{ sunrise: string|null, sunset: string|null }}
 */
export function getSunTimes(date = new Date()) {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const n = Math.floor(JD - 2451545.0 + 0.0008);
  const Jstar = n - LON / 360;

  const M = (((357.5291 + 0.98560028 * Jstar) % 360) + 360) % 360;
  const C =
    1.9148 * Math.sin(toRad(M)) +
    0.02 * Math.sin(toRad(2 * M)) +
    0.0003 * Math.sin(toRad(3 * M));
  const lambda = (((M + C + 180 + 102.9372) % 360) + 360) % 360;

  const Jtransit =
    2451545.0 +
    Jstar +
    0.0053 * Math.sin(toRad(M)) -
    0.0069 * Math.sin(toRad(2 * lambda));

  const sinDec = Math.sin(toRad(lambda)) * Math.sin(toRad(23.4397));
  const cosDec = Math.cos(Math.asin(sinDec));

  const cosH =
    (Math.sin(toRad(-0.833)) - Math.sin(toRad(LAT)) * sinDec) /
    (Math.cos(toRad(LAT)) * cosDec);

  if (cosH < -1) return { sunrise: null, sunset: null }; // sole sempre sopra
  if (cosH > 1) return { sunrise: null, sunset: null }; // sole sempre sotto

  const H = toDeg(Math.acos(cosH));
  return {
    sunrise: jdToLocalTime(Jtransit - H / 360),
    sunset: jdToLocalTime(Jtransit + H / 360),
  };
}

/**
 * Calcola la fase lunare corrente.
 * @param {Date} date
 * @returns {{ phaseName: string, illumination: number, emoji: string }}
 */
export function getMoonPhase(date = new Date()) {
  // Luna nuova di riferimento: 6 gennaio 2000 ore 18:14 UTC
  const knownNewMoon = new Date("2000-01-06T18:14:00Z");
  const synodic = 29.53058867; // giorni
  const elapsed = (date - knownNewMoon) / 86400000;
  const phase = (((elapsed / synodic) % 1) + 1) % 1; // 0..1

  const illumination = Math.round(
    ((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100,
  );

  let phaseName, emoji;
  if (phase < 0.0625) {
    phaseName = "Luna Nuova";
    emoji = "🌑";
  } else if (phase < 0.1875) {
    phaseName = "Luna Crescente";
    emoji = "🌒";
  } else if (phase < 0.3125) {
    phaseName = "Primo Quarto";
    emoji = "🌓";
  } else if (phase < 0.4375) {
    phaseName = "Gibbosa Crescente";
    emoji = "🌔";
  } else if (phase < 0.5625) {
    phaseName = "Luna Piena";
    emoji = "🌕";
  } else if (phase < 0.6875) {
    phaseName = "Gibbosa Calante";
    emoji = "🌖";
  } else if (phase < 0.8125) {
    phaseName = "Ultimo Quarto";
    emoji = "🌗";
  } else if (phase < 0.9375) {
    phaseName = "Luna Calante";
    emoji = "🌘";
  } else {
    phaseName = "Luna Nuova";
    emoji = "🌑";
  }

  return { phaseName, illumination, emoji };
}
