import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import {
  WiDaySunny,
  WiCloud,
  WiRain,
  WiHumidity,
  WiBarometer,
  WiThermometer,
  WiWindy,
  WiHot,
  WiSnowflakeCold,
  WiUmbrella,
  WiNightClear,
} from "react-icons/wi";

// Componente per una singola metrica
const WeatherMetric = ({
  icon,
  label,
  value,
  unit,
  min,
  max,
  minTime,
  maxTime,
  minLabel = "Min",
  maxLabel = "Max",
}) => {
  // Gestione più robusta dei valori nulli/undefined
  // Invece di non renderizzare, mostrerà "N/D" per i valori mancanti
  const isValidValue = (v) =>
    v !== null && v !== undefined && !isNaN(v) && isFinite(v);

  const displayValue = isValidValue(value) ? Math.round(value) : "N/D";

  // Mostra sempre la sezione statistiche, ma gestisci meglio i valori nulli o NaN
  // Usa il valore corrente come fallback se min o max non sono disponibili
  const displayMin = isValidValue(min)
    ? Math.round(min)
    : isValidValue(value)
      ? Math.round(value)
      : "N/D";

  const displayMax = isValidValue(max)
    ? Math.round(max)
    : isValidValue(value)
      ? Math.round(value)
      : "N/D";

  // Funzione per formattare il timestamp
  const formatTime = (timeString) => {
    if (!timeString) return "";
    try {
      return new Date(timeString).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="weather-metric">
      <div className="metric-header">
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-value">
        {displayValue}
        {isValidValue(value) ? unit : ""}
      </div>
      <div className="metric-stats">
        <div>
          {minLabel}: {displayMin}
          {isValidValue(min) || (isValidValue(value) && !isValidValue(min))
            ? unit
            : ""}
          {minTime && <span className="time-stamp">{formatTime(minTime)}</span>}
        </div>
        <div>
          {maxLabel}: {displayMax}
          {isValidValue(max) || (isValidValue(value) && !isValidValue(max))
            ? unit
            : ""}
          {maxTime && <span className="time-stamp">{formatTime(maxTime)}</span>}
        </div>
      </div>
    </div>
  );
};

// Mappa iconName (calcolato dal backend) → componente React con stile
function renderWeatherIcon(iconName, temp) {
  const isDay = isDayTime();
  const base = {
    filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.5))",
    animation: "float 3s ease-in-out infinite",
  };
  const glow = {
    ...base,
    filter:
      "drop-shadow(0 6px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 0 2px rgba(255,255,255,0.3))",
    textShadow: "0 0 10px rgba(255,255,255,0.8)",
  };

  switch (iconName) {
    case "rain":
      return (
        <WiRain
          size={96}
          style={{ ...base, color: isDay ? "#74b9ff" : "#3498db" }}
        />
      );
    case "cloud":
      return (
        <WiCloud
          size={96}
          style={{ ...base, color: isDay ? "#ddd" : "#95a5a6" }}
        />
      );
    case "storm":
      return (
        <WiBarometer
          size={96}
          style={{ ...base, color: isDay ? "#34495e" : "#2c3e50" }}
        />
      );
    case "fog":
      return (
        <WiCloud
          size={96}
          style={{ ...base, color: isDay ? "#bdc3c7" : "#7f8c8d" }}
        />
      );
    case "snow":
      return (
        <WiSnowflakeCold size={96} style={{ ...base, color: "#a8d8ea" }} />
      );
    case "night":
      return <WiNightClear size={96} style={{ ...glow, color: "#f1c40f" }} />;
    default: // "sunny"
      return (
        <WiDaySunny
          size={96}
          style={{
            ...glow,
            color: temp > 30 ? "#FFD700" : temp > 20 ? "#FF8C00" : "#FFA500",
          }}
        />
      );
  }
}

// Funzione per determinare se è giorno o notte
function isDayTime() {
  const now = new Date();
  const hours = now.getHours();

  // Consideriamo giorno dalle 6:00 alle 19:59
  return hours >= 6 && hours < 20;
}

// Funzione per cambiare dinamicamente il favicon in base alle condizioni meteo.
// faviconName è calcolato dal backend (es. "rain", "cloudy", "storm", "night", "sunny").
function changeFavicon(faviconName) {
  console.log(`Changing favicon to: ${faviconName}`);

  // Ottieni l'elemento favicon o creane uno nuovo se non esiste
  let favicon = document.getElementById("favicon");
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.id = "favicon";
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  try {
    // Crea un timestamp per forzare il ricaricamento dell'icona (evita caching)
    const timestamp = new Date().getTime();
    // Imposta un percorso assoluto con PUBLIC_URL e usa SVG invece di PNG
    const iconPath = `${process.env.PUBLIC_URL}/favicons/svg/favicon-${faviconName}.svg?v=${timestamp}`;

    // Log dettagliato dei percorsi
    console.log(`Tentativo di cambio favicon con i seguenti dettagli:`);
    console.log(`- PUBLIC_URL: ${process.env.PUBLIC_URL}`);
    console.log(`- Nome favicon selezionato: ${faviconName}`);
    console.log(`- Percorso completo: ${iconPath}`);
    console.log(`- Percorso del documento: ${document.location.href}`);

    // Imposta il favicon
    favicon.href = iconPath;
    favicon.type = "image/svg+xml"; // Importante specificare il tipo per SVG

    // Rimuovi qualsiasi altro favicon che potrebbe essere stato aggiunto
    const existingFavicons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"]',
    );
    existingFavicons.forEach((link) => {
      if (link.id !== "favicon") {
        document.head.removeChild(link);
      }
    });

    console.log(`Favicon impostato a: ${iconPath}`);

    // Verifica se l'icona esiste effettivamente (questo è asincrono)
    fetch(iconPath)
      .then((response) => {
        if (response.ok) {
          console.log(
            `✅ Favicon trovato e caricato correttamente: ${iconPath}`,
          );
        } else {
          console.warn(
            `⚠️ Favicon non trovato (status: ${response.status}): ${iconPath}`,
          );
        }
      })
      .catch((error) => {
        console.error(`❌ Errore nel controllo del favicon: ${error.message}`);
      });

    // Impostiamo un titolo fisso senza la descrizione meteo
    document.title = "Meteo Murro";
  } catch (e) {
    console.error("Errore nel cambio favicon:", e);
    // Se fallisce, usa il favicon di default SVG
    favicon.href = `${process.env.PUBLIC_URL}/favicons/svg/favicon-sunny.svg?v=${new Date().getTime()}`;
    favicon.type = "image/svg+xml";
  }
}

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Tentativo di connessione al backend...");
        // Usa il nuovo endpoint unificato con URL dinamico da variabili d'ambiente
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/weather/all`,
        );

        // Log dettagliato con focus sui dati statistici
        console.log(
          "Dati ricevuti dal backend:",
          JSON.stringify(response.data, null, 2),
        );
        console.log(
          "Statistiche min/max ricevute:",
          JSON.stringify(response.data.stats, null, 2),
        );

        // Verifica presenza di statistiche
        if (!response.data.stats) {
          console.warn(
            "ATTENZIONE: Nessuna statistica min/max ricevuta dal backend",
          );
        } else {
          // Conta quanti valori null ci sono nelle statistiche
          const statsValues = Object.values(response.data.stats);
          const nullValues = statsValues.filter((v) => v === null).length;
          console.log(
            `Statistiche: ${nullValues} valori null su ${statsValues.length} totali`,
          );
        }

        // Verifica presenza di osservazioni
        if (
          !response.data.current?.observations ||
          response.data.current.observations.length === 0
        ) {
          console.warn("ATTENZIONE: Nessuna osservazione corrente ricevuta");
        } else {
          console.log(
            "Numero di osservazioni ricevute:",
            response.data.current.observations.length,
          );
        }

        // Aggiungiamo un controllo specifico per l'umidità
        if (response.data.current?.observations?.length > 0) {
          const currentObs = response.data.current.observations[0];
          console.log("Verifica umidità:");
          console.log("- current.humidity:", currentObs.humidity);
          console.log(
            "- current.metric.humidity:",
            currentObs.metric?.humidity,
          );

          // Aggiungiamo un controllo per tutte le proprietà dell'osservazione
          console.log(
            "Proprietà dell'osservazione corrente:",
            Object.keys(currentObs).join(", "),
          );
          if (currentObs.metric) {
            console.log(
              "Proprietà di metric:",
              Object.keys(currentObs.metric).join(", "),
            );
          }
        }

        setWeatherData(response.data);
        setError(null);
      } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
        let errorMessage = "Impossibile caricare i dati meteo. ";

        if (
          err.code === "ECONNREFUSED" ||
          err.message.includes("Network Error")
        ) {
          errorMessage += `Il server non è raggiungibile. Assicurati che il server sia in esecuzione su ${process.env.REACT_APP_API_URL}`;
        } else if (err.response) {
          // Errore di risposta dal server (4xx, 5xx)
          errorMessage += `Errore del server: ${err.response.status} ${err.response.statusText}`;
        } else if (err.request) {
          // Nessuna risposta ricevuta
          errorMessage +=
            "Nessuna risposta dal server. Verifica la connessione di rete.";
        } else {
          // Altro tipo di errore
          errorMessage += `Dettagli: ${err.message}`;
        }

        setError(errorMessage);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 180000); // Aggiorna ogni 3 minuti
    return () => clearInterval(interval);
  }, []);

  // Timer per aggiornare l'orario corrente ogni secondo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Aggiungiamo un useEffect per cambiare dinamicamente il favicon in base alle condizioni meteo
  useEffect(() => {
    if (weatherData?.current?.observations?.[0]) {
      const current = weatherData.current.observations[0];
      const metric = current.metric;

      if (metric) {
        // faviconName calcolato dal backend
        changeFavicon(weatherData.faviconName || "sunny");
      }
    }
  }, [weatherData]); // Esegui quando cambiano i dati meteo

  // Effetto immediato per impostare il favicon di default all'avvio
  useEffect(() => {
    // Imposta subito un favicon di default con un titolo fisso
    document.title = "Meteo Murro";

    // Ottieni l'elemento favicon o creane uno nuovo se non esiste
    let favicon = document.getElementById("favicon");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.id = "favicon";
      favicon.rel = "icon";
      favicon.type = "image/svg+xml"; // Importante specificare il tipo per SVG
      document.head.appendChild(favicon);
    }

    // Controlla se è giorno o notte
    const isDay = isDayTime();

    // Usa un percorso assoluto con process.env.PUBLIC_URL
    const iconPath = `${process.env.PUBLIC_URL}/favicons/svg/favicon-${isDay ? "sunny" : "night"}.svg?v=${new Date().getTime()}`;
    favicon.href = iconPath;
    console.log(
      `Favicon iniziale impostato a: ${iconPath} (${isDay ? "giorno" : "notte"})`,
    );

    // Esegui una pulizia rimuovendo qualsiasi favicon statico che potrebbe essere stato specificato in HTML
    const existingFavicons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"]',
    );
    existingFavicons.forEach((link) => {
      if (link.id !== "favicon") {
        document.head.removeChild(link);
        console.log("Rimosso favicon statico precedente");
      }
    });

    // Verifica se l'icona esiste effettivamente (questo è asincrono)
    fetch(iconPath);
    fetch(iconPath)
      .then((response) => {
        if (response.ok) {
          console.log(
            `✅ Favicon iniziale trovato e caricato correttamente: ${iconPath}`,
          );
        } else {
          console.warn(
            `⚠️ Favicon iniziale non trovato (status: ${response.status}): ${iconPath}`,
          );
        }
      })
      .catch((error) => {
        console.error(
          `❌ Errore nel controllo del favicon iniziale: ${error.message}`,
        );
      });
  }, []);

  const current = weatherData?.current?.observations?.[0];
  const stats = weatherData?.stats;
  const metric = current?.metric;

  if (!current || !metric) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento dati meteo...</p>
          {error && (
            <div className="error-message">
              <p>
                <strong>Errore:</strong> {error}
              </p>
              <p>Suggerimenti:</p>
              <ul>
                <li>Verifica che il server sia in esecuzione</li>
                <li>
                  Controlla che non ci siano errori nella console del server
                </li>
                <li>
                  La connessione all'API meteo potrebbe essere temporaneamente
                  non disponibile
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  const weatherCondition = current.conditions || "Clear";
  const weatherIcon = renderWeatherIcon(
    weatherData.iconName || "sunny",
    metric.temp,
  );
  const backgroundClass = weatherData.backgroundClass || "weather-bg-sunny";

  // Descrizione calcolata dal backend
  const weatherDescriptionText =
    weatherData.description || weatherCondition || "";

  const lastUpdatedTime = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`App ${backgroundClass}`}>
      <main className="dashboard">
        <div className="main-weather-card">
          <div className="card-header">
            <h2>Stazione Meteo Murro</h2>
            <div className="last-updated">
              <div>Ultimo aggiornamento: {lastUpdatedTime}</div>
              <div className="current-clock">
                Ora:{" "}
                {currentTime.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>

          {current?.neighborhood && (
            <div className="weather-location">
              <div className="neighborhood-name">{current.neighborhood}</div>
            </div>
          )}

          <div className="main-info">
            <div className="weather-icon-large">{weatherIcon}</div>
            <div className="temperature-details">
              <div className="current-temp">{Math.round(metric.temp)}°C</div>
              {stats && (
                <div className="temp-min-max">
                  <span>
                    Min:{" "}
                    {stats.tempMin
                      ? Math.round(stats.tempMin)
                      : Math.round(metric.temp)}
                    °C
                    {stats.tempMinTime && (
                      <span className="time-stamp">
                        {new Date(stats.tempMinTime).toLocaleTimeString(
                          "it-IT",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    )}
                  </span>
                  <span>
                    Max:{" "}
                    {stats.tempMax
                      ? Math.round(stats.tempMax)
                      : Math.round(metric.temp)}
                    °C
                    {stats.tempMaxTime && (
                      <span className="time-stamp">
                        {new Date(stats.tempMaxTime).toLocaleTimeString(
                          "it-IT",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {current.conditions && (
                <div className="weather-condition">{current.conditions}</div>
              )}
            </div>
          </div>

          {/* Descrizione + trend previsionale nello stesso box */}
          <div className="weather-description">
            <div className="description-text">{weatherDescriptionText}</div>
            {weatherData?.trend && (
              <div className="weather-trend">
                <span
                  className={`trend-arrow trend-arrow--${weatherData.pressureTrend || "stable"}`}
                >
                  {{
                    "rising-fast": "⬆⬆",
                    rising: "⬆",
                    stable: "➡",
                    falling: "⬇",
                    "falling-fast": "⬇⬇",
                  }[weatherData.pressureTrend] || "➡"}
                </span>
                {weatherData.trend}
              </div>
            )}
          </div>

          {current?.imperial?.precipTotal > 0 && (
            <div className="weather-precipitation">
              Precipitazioni nelle ultime 24 ore: {metric.precipTotal} mm
            </div>
          )}
        </div>

        <div className="weather-grid">
          <WeatherMetric
            icon={<WiHumidity />}
            label="Umidità"
            value={current.humidity || metric.humidity}
            unit="%"
            min={stats?.humidityMin}
            max={stats?.humidityMax}
            minTime={stats?.humidityMinTime}
            maxTime={stats?.humidityMaxTime}
          />
          <WeatherMetric
            icon={<WiBarometer />}
            label="Pressione"
            value={metric.pressure}
            unit=" hPa"
            min={stats?.pressureMin}
            max={stats?.pressureMax}
            minTime={stats?.pressureMinTime}
            maxTime={stats?.pressureMaxTime}
          />
          <WeatherMetric
            icon={<WiWindy />}
            label="Vento"
            value={metric.windSpeed}
            unit=" km/h"
            min={stats?.windspeedMin}
            max={stats?.windspeedMax}
            minTime={stats?.windspeedMinTime}
            maxTime={stats?.windspeedMaxTime}
          />
          <WeatherMetric
            icon={<WiWindy />}
            label="Raffica"
            value={metric.windGust}
            unit=" km/h"
            min={stats?.windgustMin}
            max={stats?.windgustMax}
            minTime={stats?.windgustMinTime}
            maxTime={stats?.windgustMaxTime}
          />
          <WeatherMetric
            icon={<WiUmbrella />}
            label="Pioggia Oggi"
            value={metric.precipTotal}
            unit=" mm"
            min={metric.precipRate}
            max={stats?.precipTotalMax}
            maxTime={stats?.precipTotalMaxTime}
            minLabel="Rate"
            maxLabel="Total"
          />
          <WeatherMetric
            icon={<WiThermometer />}
            label="Punto di Rugiada"
            value={metric.dewpt}
            unit="°C"
            min={stats?.dewptMin}
            max={stats?.dewptMax}
            minTime={stats?.dewptMinTime}
            maxTime={stats?.dewptMaxTime}
          />
          <WeatherMetric
            icon={<WiHot />}
            label="Indice di Calore"
            value={metric.heatIndex}
            unit="°C"
            min={stats?.heatindexMin}
            max={stats?.heatindexMax}
            minTime={stats?.heatindexMinTime}
            maxTime={stats?.heatindexMaxTime}
          />
          <WeatherMetric
            icon={<WiSnowflakeCold />}
            label="Temperatura Percepita"
            value={metric.windChill}
            unit="°C"
            min={stats?.windchillMin}
            max={stats?.windchillMax}
            minTime={stats?.windchillMinTime}
            maxTime={stats?.windchillMaxTime}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
