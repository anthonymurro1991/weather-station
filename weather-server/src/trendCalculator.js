// ─────────────────────────────────────────────────────────────────────────────
// trendCalculator.js
// Analizza l'andamento di pressione e umidità nelle ultime 24 ore per
// produrre una descrizione previsionale di breve termine.
//
// Input: array observations da /v2/pws/observations/all/1day
//   Ogni slot: obs.metric.pressureMax / pressureMin
//              obs.humidityHigh / humidityLow / humidityAvg
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
 *   media dei 6 slot di ~6 ore fa. Soglie meteorologiche standard su 6h:
 *   delta >= +3 hPa → rising-fast, >= +1 → rising,
 *   delta <= -1 hPa → falling,     <= -3 → falling-fast.
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
  // Slot 66–72 dal fondo ≈ 6 ore fa → valore "passato"
  const olderSlots = observations.slice(
    Math.max(0, total - 72),
    Math.max(0, total - 66),
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
    if (dp >= 3) pressureTrend = "rising-fast";
    else if (dp >= 1) pressureTrend = "rising";
    else if (dp <= -3) pressureTrend = "falling-fast";
    else if (dp <= -1) pressureTrend = "falling";
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
