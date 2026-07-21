// ─────────────────────────────────────────────────────────────────────────────
// reverseGeocode.js
// Risolve una coppia lat/lon nel nome della località più vicina, usando il
// servizio gratuito Nominatim di OpenStreetMap (nessuna API key richiesta).
//
// Note:
//   - Zoom "10" restituisce un livello città/paese (non un indirizzo esatto):
//     coerente con la precisione reale della griglia di rilevamento (~16km).
//   - Nominatim richiede un User-Agent identificativo e ha un rate limit di
//     1 richiesta/secondo: qui viene chiamato al massimo una volta per ogni
//     refresh della cache dello storm tracker (ogni STORM_REFRESH_MINUTES),
//     quindi rientra ampiamente nei limiti d'uso gratuiti.
//   - In caso di errore/timeout non blocca la risposta: restituisce null e il
//     frontend mostra solo le coordinate.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

const BASE_URL = "https://nominatim.openstreetmap.org/reverse";

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string|null>} nome della località (es. "Bariano, BG") o null
 */
export async function reverseGeocode(lat, lon) {
  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        format: "jsonv2",
        lat,
        lon,
        zoom: 10,
        "accept-language": "it",
      },
      headers: {
        "User-Agent": "weather-station-storm-tracker/1.0",
      },
      timeout: 5000,
    });

    const address = data?.address || {};
    const place =
      address.town ||
      address.village ||
      address.city ||
      address.municipality ||
      address.hamlet ||
      null;
    const province = address.county || null;

    if (!place) return null;
    return province ? `${place}, ${province}` : place;
  } catch {
    return null;
  }
}
