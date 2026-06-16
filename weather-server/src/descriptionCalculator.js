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
 * Classifica le condizioni meteo usando tre parametri chiave:
 *   P  = pressione attuale (hPa)
 *   ΔP = variazione pressione nelle ultime 3 ore (hPa)
 *   RH = umidità relativa (%)
 *
 * Zone di classificazione P+ΔP+RH:
 *   SERENO:            P > 1018, ΔP ≥ 0, RH < 60
 *   PARZIALMENTE NUV.: P 1008–1018, |ΔP| ≤ 1, RH 60–85
 *   NUVOLOSO/PIOGGIA:  P < 1008, RH > 80, ΔP < −1
 *
 * Soglie fisse di sicurezza (priorità assoluta):
 *   precipRate, neve, temporale (< 990 hPa), nebbia, pressione critica (< 1000 hPa)
 */
function classifyFromMetrics(
  pressure,
  temp,
  humidity,
  dewpt,
  precipRate,
  pressureDelta3h,
) {
  // Precipitazioni misurate → priorità assoluta
  if (precipRate >= 2) return "rain";
  if (precipRate > 0) return "drizzle";

  // Neve: sotto i 2°C con umidità alta
  if (temp <= 2 && humidity >= 80) return "snow";

  // Temporale: pressione estrema
  if (pressure < 990) return "storm";

  // Nebbia: saturazione prossima (WMO)
  if (temp - dewpt <= 2 && humidity >= 90) return "fog";

  // Pressione critica (990–1000 hPa): maltempo certo
  if (pressure < 1000) return "overcast";

  // ── Classificazione P + ΔP + RH ─────────────────────────────────────────
  const dp = pressureDelta3h ?? 0;

  // Zona ALTA pressione (P > 1018 hPa)
  if (pressure > 1018) {
    if (dp >= 0 && humidity < 60) return "clear";
    if (humidity < 70) return "clear"; // piccolo calo ma aria secca
    return "cloudy-partly"; // umidità residua
  }

  // Zona INTERMEDIA (1008–1018 hPa)
  if (pressure >= 1008) {
    if (dp > 2 && humidity < 65) return "clear"; // netto miglioramento
    if (dp < -3 && humidity >= 75) return "overcast"; // calo rapido + umido
    if (dp < -1 && humidity >= 80) return "cloudy-mostly";
    if (Math.abs(dp) <= 1 && humidity < 60)
      return dp >= 0 ? "clear" : "cloudy-partly";
    if (humidity >= 85) return "cloudy-mostly";
    if (humidity >= 60) return "cloudy-partly";
    return dp >= 0 ? "clear" : "cloudy-partly";
  }

  // Zona BASSA pressione (1000–1008 hPa)
  if (dp < -1 && humidity > 80) return "overcast";
  if (humidity >= 80) return "overcast";
  if (humidity >= 65) return "cloudy-mostly";
  return "cloudy-partly";
}

/**
 * Calcola la descrizione testuale delle condizioni meteo.
 * @param {number}      pressure        - Pressione in hPa
 * @param {number}      temp            - Temperatura in °C
 * @param {number}      humidity        - Umidità relativa in %
 * @param {number}      dewpt           - Punto di rugiada in °C
 * @param {number|null} precipRate      - Tasso di precipitazione in mm/h
 * @param {number|null} pressureDelta3h - Variazione pressione nelle ultime 3h (hPa)
 * @returns {string} Descrizione in italiano
 */
export function getWeatherDescription(
  pressure,
  temp,
  humidity,
  dewpt,
  precipRate,
  pressureDelta3h = null,
) {
  const isDay = isDayTime();
  const timeOfDay = isDay ? "" : " notturno";
  const dp = pressureDelta3h ?? 0;
  const isRainLikely =
    (pressure < 1010 && humidity >= 80) ||
    (pressure < 1015 && dp < -2 && humidity >= 75);
  const isRainVeryLikely =
    (pressure < 1005 && humidity >= 85) ||
    (pressure < 1010 && dp < -3 && humidity >= 80);

  const category = classifyFromMetrics(
    pressure,
    temp,
    humidity,
    dewpt,
    precipRate,
    pressureDelta3h,
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
      if (temp > 40)
        return isDay
          ? "Cielo sereno, caldo torrido"
          : "Cielo sereno, notte torrida";
      if (temp > 35)
        return isDay
          ? "Cielo sereno, caldo intenso"
          : "Cielo sereno, notte calda";
      if (temp > 30)
        return isDay
          ? "Cielo sereno, caldo moderato"
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
      if (temp > 40)
        return isDay
          ? "Cielo sereno, caldo torrido"
          : "Cielo sereno, notte torrida";
      if (temp > 35)
        return isDay
          ? "Cielo sereno, caldo intenso"
          : "Cielo sereno, notte calda";
      if (temp > 30)
        return isDay
          ? "Cielo sereno, caldo moderato"
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
