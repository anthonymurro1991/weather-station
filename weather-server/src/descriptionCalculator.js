// ─────────────────────────────────────────────────────────────────────────────
// descriptionCalculator.js
// Calcola la descrizione testuale in italiano delle condizioni meteo correnti.
// Riceve i dati grezzi dall'API e usa la propria logica interna.
// La descrizione prodotta è poi letta da classifyFromDescription() per
// derivare la categoria usata da icona, sfondo e favicon.
// ─────────────────────────────────────────────────────────────────────────────

function isDayTime() {
  const hours = new Date().getHours();
  return hours >= 6 && hours < 20;
}

/**
 * Deriva internamente la categoria dalle misure numeriche della stazione.
 * Soglie basate sulla scala barometrica di Fitzroy e classificazione WMO:
 *
 *  > 1022 hPa          → Fair (sereno/variabile)
 *  1013–1022 hPa       → Changeable (variabile)
 *  1000–1013 hPa       → Rain likely (coperto/nuvoloso)
 *   990–1000 hPa       → Much rain/wind (overcast/maltempo)
 *  < 990 hPa           → Storm (temporale)
 *
 * Spread (temp – dewpt):
 *  ≤ 2°C + humidity ≥ 90% → fog (saturazione prossima)
 *  ≤ 5°C                  → aria molto umida
 */
function classifyFromMetrics(pressure, temp, humidity, dewpt, precipRate) {
  // Precipitazioni misurate → priorità assoluta
  if (precipRate >= 2) return "rain";
  if (precipRate > 0) return "drizzle";

  // Neve: sotto i 2°C con umidità alta (nevica anche leggermente sopra 0°C)
  if (temp <= 2 && humidity >= 80) return "snow";

  // Temporale: Fitzroy < 990 hPa = "Storm"
  if (pressure < 990) return "storm";

  // Nebbia: spread temp-dewpt ≤ 2°C e umidità ≥ 90% (WMO: near-saturation)
  if (temp - dewpt <= 2 && humidity >= 90) return "fog";

  // Depressione marcata (990–1000 hPa): Fitzroy "Much Rain and Wind"
  if (pressure < 1000) return "overcast";

  // Pressione sotto la norma (1000–1010 hPa): Fitzroy "Rain"
  if (pressure < 1010) {
    if (humidity >= 75) return "overcast";
    if (humidity >= 55) return "cloudy-mostly";
    return "cloudy-partly";
  }

  // Zona variabile (1010–1022 hPa): Fitzroy "Changeable"
  if (pressure < 1022) {
    if (humidity >= 80) return "cloudy-mostly";
    if (humidity >= 60) return "cloudy-partly";
  }

  // Alta pressione (> 1022 hPa): Fitzroy "Fair" → sereno
  // Se umidità ancora alta, qualche nuvola residua
  if (humidity >= 70) return "cloudy-partly";
  return "clear";
}

/**
 * Calcola la descrizione testuale delle condizioni meteo.
 * @param {string|null} condition  - Campo "conditions" dall'API (spesso null per le PWS)
 * @param {number}      pressure   - Pressione in hPa
 * @param {number}      temp       - Temperatura in °C
 * @param {number}      humidity   - Umidità relativa in %
 * @param {number}      dewpt      - Punto di rugiada in °C
 * @param {number|null} precipRate - Tasso di precipitazione in mm/h
 * @returns {string} Descrizione in italiano
 */
export function getWeatherDescription(
  pressure,
  temp,
  humidity,
  dewpt,
  precipRate,
) {
  const isDay = isDayTime();
  const timeOfDay = isDay ? "" : " notturno";
  const isRainLikely = pressure < 1010 && humidity >= 80;
  const isRainVeryLikely = pressure < 1005 && humidity >= 85;

  const category = classifyFromMetrics(
    pressure,
    temp,
    humidity,
    dewpt,
    precipRate,
  );

  switch (category) {
    case "drizzle":
      return isDay ? "Pioggerella fine" : "Pioggerella notturna";

    case "rain": {
      if (precipRate != null) {
        if (precipRate >= 15)
          return isDay
            ? "Pioggia molto intensa"
            : "Pioggia molto intensa notturna";
        if (precipRate >= 7)
          return isDay ? "Pioggia forte" : "Pioggia forte notturna";
        if (precipRate >= 2)
          return isDay ? "Pioggia moderata" : "Pioggia moderata notturna";
        if (precipRate > 0)
          return isDay ? "Pioggia leggera" : "Pioggia leggera notturna";
      }
      return isDay
        ? "Precipitazioni in corso"
        : "Precipitazioni notturne in corso";
    }

    case "storm":
      return isDay ? "Condizioni temporalesche" : "Temporale notturno";

    case "snow":
      return isDay ? "Nevicata in corso" : "Nevicata notturna in corso";

    case "fog":
      return isDay ? "Nebbia o foschia" : "Nebbia notturna";

    case "overcast":
      if (isRainVeryLikely) return "Cielo coperto, pioggia imminente";
      if (isRainLikely) return "Cielo coperto, possibile pioggia";
      return isDay
        ? "Cielo completamente coperto"
        : "Cielo notturno completamente coperto";

    case "cloudy-partly":
      if (isRainLikely)
        return isDay
          ? "Parzialmente nuvoloso, umidità elevata"
          : "Parzialmente nuvoloso, possibile pioggia";
      return isDay
        ? "Parzialmente nuvoloso"
        : "Parzialmente nuvoloso, cielo notturno";

    case "cloudy-mostly":
      if (isRainVeryLikely)
        return "Prevalentemente nuvoloso, pioggia probabile";
      if (isRainLikely) return "Prevalentemente nuvoloso, possibile pioggia";
      return isDay
        ? "Prevalentemente nuvoloso"
        : "Prevalentemente nuvoloso, cielo notturno";

    case "cloudy":
      if (isRainVeryLikely) return "Cielo nuvoloso, pioggia probabile";
      if (isRainLikely) return "Cielo nuvoloso, possibile pioggia";
      return isDay ? "Cielo nuvoloso" : "Cielo notturno nuvoloso";

    case "clear":
      if (temp > 30)
        return isDay
          ? "Cielo sereno, caldo intenso"
          : "Cielo sereno, notte calda";
      if (temp > 25)
        return isDay
          ? "Cielo sereno e soleggiato"
          : "Cielo sereno, notte tiepida";
      if (temp > 15)
        return isDay
          ? "Cielo sereno, temperatura gradevole"
          : "Cielo sereno, notte gradevole";
      return isDay
        ? "Cielo sereno, temperatura fresca"
        : "Cielo sereno, notte fresca";

    default: {
      // Nessuna categoria riconosciuta — fallback solo sui numeri
      if (pressure < 1000) {
        if (humidity >= 85)
          return "Bassa pressione e alta umidità, pioggia imminente";
        return `Bassa pressione atmosferica${timeOfDay}, possibili perturbazioni in arrivo`;
      }
      if (pressure < 1010 && humidity >= 80)
        return "Aria umida e pressione in calo, possibili precipitazioni";
      if (pressure > 1020)
        return isDay
          ? "Alta pressione, condizioni stabili"
          : "Alta pressione, condizioni stabili notturne";
      if (humidity >= 80)
        return isDay
          ? "Aria molto umida, cielo variabile"
          : "Aria molto umida, notte variabile";
      if (temp > 30)
        return isDay
          ? "Cielo sereno, caldo intenso"
          : "Cielo sereno, notte calda";
      if (temp > 25)
        return isDay
          ? "Cielo sereno, temperatura elevata"
          : "Cielo sereno, notte tiepida";
      if (temp > 20)
        return isDay
          ? "Cielo sereno, temperatura gradevole"
          : "Cielo sereno, notte gradevole";
      if (temp > 10)
        return isDay
          ? "Cielo sereno, temperatura mite"
          : "Cielo sereno, notte fresca";
      if (temp > 0)
        return isDay
          ? "Cielo sereno, temperatura fresca"
          : "Cielo sereno, notte fredda";
      return isDay
        ? "Cielo sereno, temperatura sotto lo zero"
        : "Cielo sereno, notte gelida";
    }
  }
}
