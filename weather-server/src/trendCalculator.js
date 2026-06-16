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
      pressureDelta3h: null,
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
  // Slot 36–42 dal fondo ≈ 3 ore fa → delta a 3h
  const slots3hAgo = observations.slice(
    Math.max(0, total - 42),
    Math.max(0, total - 36),
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

  // ── Delta pressione 3h (valore numerico hPa, usato da classifyFromMetrics) ──
  const pressure3hAgo = avg(
    slots3hAgo.map((o) => o.metric?.pressureMax ?? o.metric?.pressureMin),
  );
  let pressureDelta3h = null;
  if (recentPressure != null && pressure3hAgo != null) {
    pressureDelta3h = Math.round((recentPressure - pressure3hAgo) * 10) / 10;
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

  return { pressureTrend, humidityTrend, forecastText, pressureDelta3h };
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
 * Stima la probabilità di pioggia su tre orizzonti temporali.
 *
 * Sistema a punteggio (score) basato su quattro segnali:
 *   1. ΔP₃h  — variazione pressione nelle ultime 3h (segnale principale)
 *   2. P     — pressione assoluta (supporto)
 *   3. RH    — umidità relativa (fondamentale)
 *   4. T−Td  — spread temperatura/rugiada (saturazione aria)
 *
 * Tabella score → probabilità:
 *   ≤ 0 → bassa  | 1–3 → possibile | 4–6 → probabile | ≥ 7 → molto probabile
 *
 * @param {string}      pressureTrend  - trend 12h (rising/falling/...)
 * @param {string}      humidityTrend
 * @param {Array}       observations
 * @param {object}      currentObs
 * @param {number|null} pressureDelta3h - ΔP nelle ultime 3h (hPa)
 * @returns {{ probability: number, probability3h: number, probability12h: number }}
 */
export function computeRainProbability(
  pressureTrend,
  humidityTrend,
  observations,
  currentObs,
  pressureDelta3h,
) {
  const metric = currentObs?.metric || {};
  const humidity = currentObs?.humidity ?? metric.humidity ?? 0;
  const precipRate = metric.precipRate ?? 0;
  const temp = metric.temp ?? null;
  const dewpt = metric.dewpt ?? null;
  const pressure = metric.pressure ?? null;
  const dp = pressureDelta3h ?? 0;

  // Sta già piovendo
  if (precipRate > 0) {
    return { probability: 95, probability3h: 95, probability12h: 95 };
  }

  // ── Funzione di mappatura score → % ────────────────────────────────────
  function scoreToProb(map, s) {
    const idx = Math.min(Math.max(Math.round(s), 0), map.length - 1);
    return map[idx];
  }

  // ── Score BASE (rischio corrente) ───────────────────────────────────────
  let score = 0;

  // 1. ΔP₃h — segnale più affidabile
  if (dp < -5) score += 5;
  else if (dp < -3) score += 4;
  else if (dp < -1) score += 2;
  else if (dp > +1) score -= 2;

  // 2. Pressione assoluta
  if (pressure != null) {
    if (pressure < 1000) score += 3;
    else if (pressure < 1010) score += 2;
    else if (pressure > 1020 && dp >= 0) score -= 3;
  }

  // 3. Umidità relativa
  if (humidity > 90) score += 3;
  else if (humidity > 80) score += 2;
  else if (humidity < 60) score -= 1;

  // 4. Spread T − punto di rugiada
  if (temp != null && dewpt != null) {
    const spread = temp - dewpt;
    if (spread < 2) score += 2;
    else if (spread < 5) score += 1;
    else if (spread > 15) score -= 1;
  }

  // Mappa score → % corrente
  // score:  0    1    2    3    4    5    6    7    8+
  const probMap = [5, 15, 25, 40, 55, 68, 78, 87, 93];
  const probability = scoreToProb(probMap, score);

  // ── Score 3h (imminente) — peso maggiore su ΔP rapido ──────────────────
  let score3h = 0;

  if (dp < -5) score3h += 6;
  else if (dp < -3) score3h += 5;
  else if (dp < -1) score3h += 2;
  else if (dp > +1) score3h -= 3;

  if (humidity > 90) score3h += 3;
  else if (humidity > 80) score3h += 2;
  else if (humidity < 60) score3h -= 1;

  if (temp != null && dewpt != null) {
    const spread = temp - dewpt;
    if (spread < 2) score3h += 2;
    else if (spread < 5) score3h += 1;
  }

  // score:    0    1    2    3    4    5    6    7    8+
  const prob3hMap = [3, 8, 15, 25, 38, 52, 65, 78, 90];
  const probability3h = scoreToProb(prob3hMap, score3h);

  // ── Score 12h (medio termine) — aggiunge trend 12h ─────────────────────
  let score12h = score;

  if (pressureTrend === "falling-fast") score12h += 2;
  else if (pressureTrend === "falling") score12h += 1;
  else if (pressureTrend === "rising-fast") score12h -= 2;
  else if (pressureTrend === "rising") score12h -= 1;

  if (humidityTrend === "rising-fast") score12h += 1;
  else if (humidityTrend === "falling-fast") score12h -= 1;

  // score:     0    1    2    3    4    5    6    7    8+
  const prob12hMap = [10, 20, 32, 48, 62, 74, 83, 90, 95];
  const probability12h = scoreToProb(prob12hMap, score12h);

  return { probability, probability3h, probability12h };
}
