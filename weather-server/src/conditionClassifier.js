// ─────────────────────────────────────────────────────────────────────────────
// conditionClassifier.js
// Classifica la categoria meteo canonica leggendo la descrizione italiana
// prodotta da getWeatherDescription().
//
// Categorie possibili:
//   "drizzle" | "rain" | "storm" | "snow" | "fog"
//   "overcast" | "cloudy-mostly" | "cloudy-partly" | "cloudy"
//   "clear" | null
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deriva la categoria canonica leggendo la descrizione italiana
 * prodotta da getWeatherDescription().
 * @param {string} description - Testo della descrizione in italiano
 * @returns {string|null} categoria canonica
 */
export function classifyFromDescription(description) {
  if (!description) return null;
  const d = description.toLowerCase();

  if (d.includes("pioggerella")) return "drizzle";
  if (d.includes("pioggia") || d.includes("precipitazioni")) return "rain";
  if (d.includes("temporale") || d.includes("temporalesche")) return "storm";
  if (d.includes("nevicata") || d.includes("neve")) return "snow";
  if (d.includes("nebbia") || d.includes("foschia")) return "fog";
  if (d.includes("parzialmente nuvoloso")) return "cloudy-partly";
  if (d.includes("prevalentemente nuvoloso")) return "cloudy-mostly";
  if (d.includes("coperto")) return "overcast";
  if (d.includes("nuvoloso") || d.includes("variabile")) return "cloudy";
  if (d.includes("perturbazioni") || d.includes("bassa pressione"))
    return "storm";
  if (
    d.includes("sereno") ||
    d.includes("soleggiato") ||
    d.includes("alta pressione") ||
    d.includes("caldo") ||
    d.includes("umida")
  )
    return "clear";

  return null;
}
