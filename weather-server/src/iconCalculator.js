// ─────────────────────────────────────────────────────────────────────────────
// iconCalculator.js
// Calcola nome icona, classe CSS sfondo e nome favicon a partire dalla
// categoria canonica prodotta da classifyCondition().
//
// iconName possibili:     "rain" | "cloud" | "storm" | "fog" | "snow" | "night" | "sunny"
// backgroundClass esempi: "weather-bg-rain" | "weather-bg-cloudy" | ...
// faviconName esempi:     "rain" | "cloudy" | "storm" | "foggy" | "snow" | "sunny" | "night" | "hot"
// ─────────────────────────────────────────────────────────────────────────────

function isDayTime() {
  const hours = new Date().getHours();
  return hours >= 6 && hours < 20;
}

/**
 * Restituisce il nome dell'icona da usare nel frontend.
 * @param {string|null} category - Categoria canonica da classifyCondition()
 * @returns {string} iconName
 */
export function getIconName(category) {
  const isDay = isDayTime();
  switch (category) {
    case "drizzle":
    case "rain":
      return "rain";
    case "storm":
      return "storm";
    case "snow":
      return "snow";
    case "fog":
      return "fog";
    case "overcast":
    case "cloudy-mostly":
    case "cloudy-partly":
    case "cloudy":
      return "cloud";
    case "clear":
    default:
      return isDay ? "sunny" : "night";
  }
}

/**
 * Restituisce il nome del file favicon da usare nel frontend.
 * I nomi corrispondono ai file SVG in public/favicons/svg/.
 * @param {string|null} category - Categoria canonica da classifyCondition()
 * @param {number}      temp     - Temperatura in °C
 * @returns {string} faviconName
 */
export function getFaviconName(category, temp) {
  const isDay = isDayTime();
  switch (category) {
    case "drizzle":
    case "rain":
      return "rain";
    case "storm":
      return "storm";
    case "snow":
      return "snow";
    case "fog":
      return "foggy";
    case "overcast":
    case "cloudy-mostly":
    case "cloudy-partly":
    case "cloudy":
      return "cloudy";
    case "clear":
    default:
      if (temp > 30) return isDay ? "hot" : "night-hot";
      return isDay ? "sunny" : "night";
  }
}

/**
 * Restituisce la classe CSS dello sfondo da applicare nel frontend.
 * @param {string|null} category - Categoria canonica da classifyCondition()
 * @param {number}      temp     - Temperatura in °C
 * @returns {string} backgroundClass
 */
export function getBackgroundClass(category, temp) {
  const isDay = isDayTime();
  switch (category) {
    case "drizzle":
    case "rain":
      return isDay ? "weather-bg-rain" : "weather-bg-rain-night";
    case "storm":
      return isDay ? "weather-bg-storm" : "weather-bg-storm-night";
    case "fog":
      return isDay ? "weather-bg-foggy" : "weather-bg-foggy-night";
    case "overcast":
    case "cloudy-mostly":
    case "cloudy-partly":
    case "cloudy":
      return isDay ? "weather-bg-cloudy" : "weather-bg-cloudy-night";
    case "clear":
    default:
      if (!isDay) return "weather-bg-night";
      if (temp > 30) return "weather-bg-hot";
      if (temp > 20) return "weather-bg-sunny";
      if (temp > 10) return "weather-bg-mild";
      return "weather-bg-cool";
  }
}
