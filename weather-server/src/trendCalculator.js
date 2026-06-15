// ─────────────────────────────────────────────────────────────────────────────
// trendCalculator.js
// Analizza l'andamento di pressione e umidità nelle ultime 24 ore per
// produrre una descrizione previsionale di breve termine.
//
// Input: array observations da /v2/pws/observations/all/1day
//   Ogni slot: obs.metric.pressureMax / pressureMin
//              obs.humidityHigh / humidityLow / humidityAvg
//
// Trend pressione calcolato su base 12h (non 6h).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Media di un array di numeri (ignora null/undefined/NaN).
 */
function avg(values) {
  const valid = values.filter((v) => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Calcola il trend di pressione e umidità.
 *
 * Pressione: delta tra media degli ultimi 6 slot (~30 min, "adesso") e
 *   media dei 6 slot di ~12 ore fa. Soglie meteorologiche standard su 12h:
 *   delta >= +6 hPa → rising-fast, >= +2 → rising,
 *   delta <= -2 hPa → falling,     <= -6 → falling-fast.
 *
 * Umidità: stesso approccio — confronto recente vs ~6h fa.
 *
 * @param {Array} observations - Osservazioni delle 24h (ordinate dal più vecchio al più recente)
 * @returns {{ pressureTrend: string, humidityTrend: string, forecastText: string }}
 */
export function computeTrend(observations) {
  if (!observations || observations.length < 4) {
    return {
      pressureTrend: "stable",
      humidityTrend: "stable",
      forecastText: null,
    };
  }

  const total = observations.length;
  // Ultimi 6 slot ≈ 30 min → valore "adesso"
  const recentSlots = observations.slice(Math.max(0, total - 6));
  // Slot 138–144 dal fondo ≈ 12 ore fa → valore "passato"
  const olderSlots = observations.slice(
    Math.max(0, total - 144),
    Math.max(0, total - 138),
  );

  // ── Trend pressione — delta hPa reali su ~6 ore ───────────────────────────
  const recentPressure = avg(
    recentSlots.map((o) => o.metric?.pressureMax ?? o.metric?.pressureMin),
  );
  const olderPressure = avg(
    olderSlots.map((o) => o.metric?.pressureMax ?? o.metric?.pressureMin),
  );

  let pressureTrend = "stable";
  if (recentPressure != null && olderPressure != null) {
    const dp = recentPressure - olderPressure;
    if (dp >= 6) pressureTrend = "rising-fast";
    else if (dp >= 2) pressureTrend = "rising";
    else if (dp <= -6) pressureTrend = "falling-fast";
    else if (dp <= -2) pressureTrend = "falling";
  }

  // ── Trend umidità — delta % su ~6 ore ────────────────────────────────────
  const recentHumidity = avg(
    recentSlots.map((o) => o.humidityHigh ?? o.humidity),
  );
  const olderHumidity = avg(
    olderSlots.map((o) => o.humidityHigh ?? o.humidity),
  );

  let humidityTrend = "stable";
  if (recentHumidity != null && olderHumidity != null) {
    const dh = recentHumidity - olderHumidity;
    if (dh >= 10) humidityTrend = "rising-fast";
    else if (dh >= 5) humidityTrend = "rising";
    else if (dh <= -10) humidityTrend = "falling-fast";
    else if (dh <= -5) humidityTrend = "falling";
  }

  const forecastText = buildForecastText(
    pressureTrend,
    humidityTrend,
    recentPressure,
    recentHumidity,
  );

  return { pressureTrend, humidityTrend, forecastText };
}

/**
 * Costruisce il testo previsionale in italiano combinando i due trend.
 */
function buildForecastText(pressureTrend, humidityTrend, pressure, humidity) {
  const pressureLabel = {
    "rising-fast": "Pressione in rapida salita",
    rising: "Pressione in salita",
    stable: "Pressione stabile",
    falling: "Pressione in calo",
    "falling-fast": "Pressione in forte calo",
  }[pressureTrend];

  // Combina pressione + umidità per una previsione
  if (pressureTrend === "falling-fast" && humidityTrend.startsWith("rising")) {
    return `${pressureLabel} e umidità in aumento — pioggia probabile a breve`;
  }
  if (pressureTrend === "falling-fast") {
    return `${pressureLabel} — possibile peggioramento nelle prossime ore`;
  }
  if (pressureTrend === "falling" && humidityTrend.startsWith("rising")) {
    return `${pressureLabel} e umidità in aumento — condizioni in peggioramento`;
  }
  if (pressureTrend === "falling" && humidityTrend === "stable") {
    return `${pressureLabel} — monitorare l'evoluzione`;
  }
  if (pressureTrend === "falling") {
    return `${pressureLabel} — condizioni in lieve peggioramento`;
  }
  if (pressureTrend === "rising-fast") {
    return `${pressureLabel} — rapido miglioramento in corso`;
  }
  if (pressureTrend === "rising") {
    if (humidityTrend === "falling" || humidityTrend === "falling-fast") {
      return `${pressureLabel} e umidità in calo — schiarite in arrivo`;
    }
    return `${pressureLabel} — condizioni in miglioramento`;
  }

  // Pressione stabile — guarda solo l'umidità
  if (humidityTrend === "rising-fast") {
    return `${pressureLabel} — umidità in forte aumento, possibile pioggia`;
  }
  if (humidityTrend === "rising") {
    return `${pressureLabel} — umidità in aumento`;
  }
  if (humidityTrend === "falling" || humidityTrend === "falling-fast") {
    return `${pressureLabel} — umidità in calo, condizioni stabili`;
  }

  return `${pressureLabel} — condizioni stabili`;
}

/**
 * Stima la probabilità di pioggia (0–95%) basandosi solo sui dati della stazione.
 *
 * Fattori:
 *  - precipRate > 0        → sta già piovendo (95%)
 *  - pressureTrend         → falling/falling-fast aumenta probabilità
 *  - humidityTrend         → rising aumenta probabilità
 *  - humidity corrente     → soglie 70% e 85%
 *  - dewpt depression      → (temp - dewpt) < 5°C → aria quasi satura
 *  - trend pressione 3h    → calo rapido nelle ultime 3h
 *
 * @param {string} pressureTrend
 * @param {string} humidityTrend
 * @param {Array}  observations
 * @param {object} currentObs  - osservazione corrente (metric.temp, metric.dewpt, ecc.)
 * @returns {number} percentuale intera 0–95
 */
export function computeRainProbability(
  pressureTrend,
  humidityTrend,
  observations,
  currentObs,
) {
  const metric = currentObs?.metric || {};
  const humidity = currentObs?.humidity ?? metric.humidity ?? 0;
  const precipRate = metric.precipRate ?? 0;
  const temp = metric.temp ?? null;
  const dewpt = metric.dewpt ?? null;

  // Sta già piovendo
  if (precipRate > 0) return 95;

  let prob = 15; // base

  // Trend pressione
  if (pressureTrend === "falling-fast") prob += 35;
  else if (pressureTrend === "falling") prob += 20;
  else if (pressureTrend === "rising") prob -= 10;
  else if (pressureTrend === "rising-fast") prob -= 20;

  // Trend umidità
  if (humidityTrend === "rising-fast") prob += 15;
  else if (humidityTrend === "rising") prob += 8;
  else if (humidityTrend === "falling") prob -= 5;

  // Umidità assoluta corrente
  if (humidity >= 85) prob += 15;
  else if (humidity >= 70) prob += 8;

  // Dewpoint depression (temp - dewpt): più è bassa, più l'aria è satura
  if (temp != null && dewpt != null) {
    const depression = temp - dewpt;
    if (depression < 2) prob += 15;
    else if (depression < 5) prob += 8;
    else if (depression > 15) prob -= 5;
  }

  // Calo pressione nelle ultime 3h (slot 30–36 dal fondo ≈ 3h fa)
  const total = observations.length;
  const recent3h = observations.slice(Math.max(0, total - 6));
  const older3h = observations.slice(
    Math.max(0, total - 36),
    Math.max(0, total - 30),
  );
  const pRecent = avg(
    recent3h.map((o) => o.metric?.pressureMax ?? o.metric?.pressureMin),
  );
  const pOlder = avg(
    older3h.map((o) => o.metric?.pressureMax ?? o.metric?.pressureMin),
  );
  if (pRecent != null && pOlder != null) {
    const dp3h = pRecent - pOlder;
    if (dp3h <= -2) prob += 10;
  }

  return Math.min(95, Math.max(0, Math.round(prob)));
}
