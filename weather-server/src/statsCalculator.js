// ─────────────────────────────────────────────────────────────────────────────
// statsCalculator.js
// Calcola i valori minimi e massimi giornalieri a partire dall'array di
// osservazioni restituito dall'endpoint /all/1day di Weather.com.
//
// Struttura reale di ogni osservazione:
//   obs.humidityHigh / obs.humidityLow          → radice dell'oggetto
//   obs.metric.tempHigh / tempLow
//   obs.metric.pressureMax / pressureMin
//   obs.metric.windspeedHigh / windspeedLow
//   obs.metric.windgustHigh / windgustLow
//   obs.metric.dewptHigh / dewptLow
//   obs.metric.windchillHigh / windchillLow
//   obs.metric.heatindexHigh / heatindexLow
//   obs.metric.precipTotal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dato un array di osservazioni e una funzione getValue(obs),
 * restituisce { min, max, minTime, maxTime }.
 * I valori null/undefined/NaN vengono ignorati.
 */
function findMinMaxWithTime(observations, getValue) {
  const valid = observations.filter((obs) => {
    const v = getValue(obs);
    return v !== null && v !== undefined && !isNaN(v);
  });

  if (valid.length === 0) {
    return { min: null, max: null, minTime: null, maxTime: null };
  }

  let minObs = valid[0];
  let maxObs = valid[0];

  for (const obs of valid) {
    if (getValue(obs) < getValue(minObs)) minObs = obs;
    if (getValue(obs) > getValue(maxObs)) maxObs = obs;
  }

  return {
    min: getValue(minObs),
    max: getValue(maxObs),
    minTime: minObs.obsTimeLocal,
    maxTime: maxObs.obsTimeLocal,
  };
}

/**
 * Costruisce l'oggetto stats con min/max per ogni metrica.
 * @param {object} currentObs   - L'osservazione corrente (observations[0] di /current)
 * @param {Array}  observations - Tutte le osservazioni delle 24 ore (da /all/1day)
 * @returns {object} stats
 */
export function computeStats(currentObs, observations) {
  const m = currentObs?.metric || {};
  const humidity = currentObs?.humidity ?? m?.humidity;
  const t = currentObs?.obsTimeLocal;

  // Inizializza tutto col valore corrente come fallback
  const stats = {
    tempMin: m.temp,
    tempMax: m.temp,
    tempMinTime: t,
    tempMaxTime: t,
    humidityMin: humidity,
    humidityMax: humidity,
    humidityMinTime: t,
    humidityMaxTime: t,
    pressureMin: m.pressure,
    pressureMax: m.pressure,
    pressureMinTime: t,
    pressureMaxTime: t,
    windspeedMin: m.windSpeed,
    windspeedMax: m.windSpeed,
    windspeedMinTime: t,
    windspeedMaxTime: t,
    windgustMin: m.windGust,
    windgustMax: m.windGust,
    windgustMinTime: t,
    windgustMaxTime: t,
    dewptMin: m.dewpt,
    dewptMax: m.dewpt,
    dewptMinTime: t,
    dewptMaxTime: t,
    heatindexMin: m.heatIndex,
    heatindexMax: m.heatIndex,
    heatindexMinTime: t,
    heatindexMaxTime: t,
    windchillMin: m.windChill,
    windchillMax: m.windChill,
    windchillMinTime: t,
    windchillMaxTime: t,
    precipTotalMax: m.precipTotal,
    precipTotalMaxTime: t,
  };

  if (!observations || observations.length === 0) return stats;

  // Helper: applica il risultato min/max all'oggetto stats
  const apply = (result, minKey, maxKey, minTimeKey, maxTimeKey) => {
    if (result.min !== null) {
      stats[minKey] = result.min;
      stats[minTimeKey] = result.minTime;
    }
    if (result.max !== null) {
      stats[maxKey] = result.max;
      stats[maxTimeKey] = result.maxTime;
    }
  };
  // Helper per aggiornare solo il minimo globale
  const applyMin = (result, minKey, minTimeKey) => {
    if (result.min !== null) {
      stats[minKey] = result.min;
      stats[minTimeKey] = result.minTime;
    }
  };
  // Helper per aggiornare solo il massimo globale
  const applyMax = (result, maxKey, maxTimeKey) => {
    if (result.max !== null) {
      stats[maxKey] = result.max;
      stats[maxTimeKey] = result.maxTime;
    }
  };

  // Temperatura: tempLow e tempHigh sono dentro metric
  applyMin(
    findMinMaxWithTime(observations, (o) => o.metric?.tempLow),
    "tempMin",
    "tempMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.metric?.tempHigh),
    "tempMax",
    "tempMaxTime",
  );

  // Umidità: humidityLow/High sono a radice (fuori da metric)
  applyMin(
    findMinMaxWithTime(observations, (o) => o.humidityLow),
    "humidityMin",
    "humidityMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.humidityHigh),
    "humidityMax",
    "humidityMaxTime",
  );

  // Pressione: pressureMin e pressureMax sono dentro metric
  applyMin(
    findMinMaxWithTime(observations, (o) => o.metric?.pressureMin),
    "pressureMin",
    "pressureMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.metric?.pressureMax),
    "pressureMax",
    "pressureMaxTime",
  );

  // Velocità vento
  applyMin(
    findMinMaxWithTime(observations, (o) => o.metric?.windspeedLow),
    "windspeedMin",
    "windspeedMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.metric?.windspeedHigh),
    "windspeedMax",
    "windspeedMaxTime",
  );

  // Raffica di vento
  applyMin(
    findMinMaxWithTime(observations, (o) => o.metric?.windgustLow),
    "windgustMin",
    "windgustMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.metric?.windgustHigh),
    "windgustMax",
    "windgustMaxTime",
  );

  // Punto di rugiada
  applyMin(
    findMinMaxWithTime(observations, (o) => o.metric?.dewptLow),
    "dewptMin",
    "dewptMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.metric?.dewptHigh),
    "dewptMax",
    "dewptMaxTime",
  );

  // Indice di calore
  applyMin(
    findMinMaxWithTime(observations, (o) => o.metric?.heatindexLow),
    "heatindexMin",
    "heatindexMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.metric?.heatindexHigh),
    "heatindexMax",
    "heatindexMaxTime",
  );

  // Temperatura percepita (wind chill)
  applyMin(
    findMinMaxWithTime(observations, (o) => o.metric?.windchillLow),
    "windchillMin",
    "windchillMinTime",
  );
  applyMax(
    findMinMaxWithTime(observations, (o) => o.metric?.windchillHigh),
    "windchillMax",
    "windchillMaxTime",
  );

  // Precipitazioni: valore cumulato, il MAX è il totale giornaliero
  const precipResult = findMinMaxWithTime(
    observations,
    (o) => o.metric?.precipTotal,
  );
  if (precipResult.max !== null) {
    stats.precipTotalMax = precipResult.max;
    stats.precipTotalMaxTime = precipResult.maxTime;
  }

  return stats;
}
