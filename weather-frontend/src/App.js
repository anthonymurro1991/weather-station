import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
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
  WiNightClear
} from 'react-icons/wi';

// Componente per una singola metrica
const WeatherMetric = ({ icon, label, value, unit, min, max }) => {
  // Gestione più robusta dei valori nulli/undefined
  // Invece di non renderizzare, mostrerà "N/D" per i valori mancanti
  const isValidValue = (v) => v !== null && v !== undefined && !isNaN(v) && isFinite(v);
  
  const displayValue = isValidValue(value) ? Math.round(value) : "N/D";
  
  // Mostra sempre la sezione statistiche, ma gestisci meglio i valori nulli o NaN
  // Usa il valore corrente come fallback se min o max non sono disponibili
  const displayMin = isValidValue(min) 
    ? Math.round(min) 
    : (isValidValue(value) ? Math.round(value) : "N/D");
  
  const displayMax = isValidValue(max) 
    ? Math.round(max) 
    : (isValidValue(value) ? Math.round(value) : "N/D");

  return (
    <div className="weather-metric">
      <div className="metric-header">
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-value">{displayValue}{isValidValue(value) ? unit : ""}</div>
      <div className="metric-stats">
        <div>Min: {displayMin}{isValidValue(min) || (isValidValue(value) && !isValidValue(min)) ? unit : ""}</div>
        <div>Max: {displayMax}{isValidValue(max) || (isValidValue(value) && !isValidValue(max)) ? unit : ""}</div>
      </div>
    </div>
  );
};

function getWeatherIcon(condition, pressure, temp) {
  const iconStyle = { 
    filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.5))',
    animation: 'float 3s ease-in-out infinite'
  };
  
  // Verifica se è giorno o notte
  const isDay = isDayTime();
  
  // Controllo più dettagliato per le condizioni meteorologiche
  if (condition) {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('rain') || conditionLower.includes('pioggia'))
      return <WiRain size={96} style={{...iconStyle, color: isDay ? '#74b9ff' : '#3498db'}} />;
    
    if (conditionLower.includes('cloud') || conditionLower.includes('cloudy') || conditionLower.includes('nuvoloso'))
      return <WiCloud size={96} style={{...iconStyle, color: isDay ? '#ddd' : '#95a5a6'}} />;
    
    if (conditionLower.includes('storm') || conditionLower.includes('thunder') || conditionLower.includes('temporale'))
      return <WiBarometer size={96} style={{...iconStyle, color: isDay ? '#34495e' : '#2c3e50'}} />;
    
    if (conditionLower.includes('fog') || conditionLower.includes('mist') || conditionLower.includes('nebbia'))
      return <WiCloud size={96} style={{...iconStyle, color: isDay ? '#bdc3c7' : '#7f8c8d'}} />;
  }
  
  // Controllo pressione bassa
  if (pressure < 1000) 
    return <WiBarometer size={96} style={{...iconStyle, color: isDay ? '#0984e3' : '#2980b9'}} />;
  
  // Se è notte, mostra la luna invece del sole
  if (!isDay) {
    // Stile per la luna
    const moonStyle = {
      ...iconStyle,
      filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 0 2px rgba(255,255,255,0.3))',
      color: '#f1c40f',
      textShadow: '0 0 10px rgba(255,255,255,0.8)'
    };
    return <WiNightClear size={96} style={moonStyle} />;
  }
  
  // Icona sole con colori più contrastanti e outline (solo per il giorno)
  const sunStyle = {
    ...iconStyle,
    filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 0 2px rgba(255,255,255,0.3))',
    color: temp > 30 ? '#FFD700' : temp > 20 ? '#FF8C00' : '#FFA500',
    textShadow: '0 0 10px rgba(255,255,255,0.8)'
  };
  
  return <WiDaySunny size={96} style={sunStyle} />;
}

function getWeatherBackground(condition, pressure, temp) {
  // Verifica se è giorno o notte
  const isDay = isDayTime();
  
  if (condition) {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('rain') || conditionLower.includes('pioggia')) {
      return isDay ? 'weather-bg-rain' : 'weather-bg-rain-night';
    }
    
    if (conditionLower.includes('cloud') || conditionLower.includes('cloudy') || conditionLower.includes('nuvoloso')) {
      return isDay ? 'weather-bg-cloudy' : 'weather-bg-cloudy-night';
    }
    
    if (conditionLower.includes('storm') || conditionLower.includes('thunder') || conditionLower.includes('temporale')) {
      return isDay ? 'weather-bg-storm' : 'weather-bg-storm-night';
    }
    
    if (conditionLower.includes('fog') || conditionLower.includes('mist') || conditionLower.includes('nebbia')) {
      return isDay ? 'weather-bg-foggy' : 'weather-bg-foggy-night';
    }
  }
  
  if (pressure < 1000) {
    return isDay ? 'weather-bg-storm' : 'weather-bg-storm-night';
  }
  
  // Se è notte, restituisci lo sfondo notturno
  if (!isDay) {
    return 'weather-bg-night';
  }
  
  // Cielo sereno di giorno - varia in base alla temperatura
  if (temp > 30) {
    return 'weather-bg-hot';
  } else if (temp > 20) {
    return 'weather-bg-sunny';
  } else if (temp > 10) {
    return 'weather-bg-mild';
  } else {
    return 'weather-bg-cool';
  }
}

// Restituisce una descrizione in italiano della condizione meteo
function getWeatherDescription(condition, pressure, temp, humidity) {
  // Verifica se è giorno o notte
  const isDay = isDayTime();
  const timeOfDay = isDay ? "" : " notturno";
  
  if (!condition) {
    // Se non abbiamo la condizione, creiamo una descrizione basata su altri parametri
    if (pressure < 1000) {
      return `Bassa pressione atmosferica${timeOfDay}, possibili perturbazioni in arrivo`;
    } else if (pressure > 1020) {
      return `Alta pressione${timeOfDay}, condizioni stabili`;
    }
    
    // Descrizioni basate sulla temperatura e ora del giorno
    if (temp > 30) {
      return isDay ? "Cielo sereno, caldo intenso" : "Cielo sereno, notte calda";
    } else if (temp > 25) {
      return isDay ? "Cielo sereno, temperatura elevata" : "Cielo sereno, notte tiepida";
    } else if (temp > 20) {
      return isDay ? "Cielo sereno, temperatura gradevole" : "Cielo sereno, notte gradevole";
    } else if (temp > 10) {
      return isDay ? "Cielo sereno, temperatura mite" : "Cielo sereno, notte fresca";
    } else if (temp > 0) {
      return isDay ? "Cielo sereno, temperatura fresca" : "Cielo sereno, notte fredda";
    } else {
      return isDay ? "Cielo sereno, temperatura sotto lo zero" : "Cielo sereno, notte gelida";
    }
  }

  // Traduzioni e descrizioni dettagliate basate sulla condizione meteo
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain') || conditionLower.includes('pioggia')) {
    if (conditionLower.includes('light') || conditionLower.includes('leggera')) {
      return isDay ? "Pioggia leggera" : "Pioggia leggera notturna";
    } else if (conditionLower.includes('heavy') || conditionLower.includes('forte')) {
      return isDay ? "Pioggia intensa" : "Pioggia intensa notturna";
    }
    return isDay ? "Precipitazioni in corso" : "Precipitazioni notturne in corso";
  }
  
  if (conditionLower.includes('cloud') || conditionLower.includes('cloudy') || conditionLower.includes('nuvoloso')) {
    if (conditionLower.includes('partly') || conditionLower.includes('parzialmente')) {
      return isDay ? "Parzialmente nuvoloso" : "Parzialmente nuvoloso, cielo notturno";
    } else if (conditionLower.includes('mostly') || conditionLower.includes('prevalentemente')) {
      return isDay ? "Prevalentemente nuvoloso" : "Prevalentemente nuvoloso, cielo notturno";
    }
    return isDay ? "Cielo nuvoloso" : "Cielo notturno nuvoloso";
  }
  
  if (conditionLower.includes('storm') || conditionLower.includes('thunder') || conditionLower.includes('temporale')) {
    return isDay ? "Condizioni temporalesche" : "Temporale notturno";
  }
  
  if (conditionLower.includes('fog') || conditionLower.includes('mist') || conditionLower.includes('nebbia')) {
    return isDay ? "Nebbia o foschia" : "Nebbia notturna";
  }
  
  if (conditionLower.includes('clear') || conditionLower.includes('sunny') || conditionLower.includes('sereno')) {
    if (temp > 30) {
      return isDay ? "Cielo sereno, caldo intenso" : "Cielo sereno, notte calda";
    } else if (temp > 25) {
      return isDay ? "Cielo sereno e soleggiato" : "Cielo sereno, notte tiepida";
    } else if (temp > 15) {
      return isDay ? "Cielo sereno, temperatura gradevole" : "Cielo sereno, notte gradevole";
    } else {
      return isDay ? "Cielo sereno, temperatura fresca" : "Cielo sereno, notte fresca";
    }
  }
  
  if (conditionLower.includes('snow') || conditionLower.includes('neve')) {
    return isDay ? "Nevicata in corso" : "Nevicata notturna in corso";
  }
  
  // Se non riusciamo a trovare una traduzione specifica, restituiamo la condizione originale
  return condition;
}

// Funzione per determinare se è giorno o notte
function isDayTime() {
  const now = new Date();
  const hours = now.getHours();
  
  // Consideriamo giorno dalle 6:00 alle 19:59
  return hours >= 6 && hours < 20;
}

// Funzione per cambiare dinamicamente il favicon in base alle condizioni meteo
function changeFavicon(weatherCondition, pressure, temp, descriptionText) {
  let faviconName = 'sunny';
  
  // Verifica se è giorno o notte
  const isDay = isDayTime();
  
  // Usa la stessa logica di getWeatherIcon per determinare quale icona usare
  if (weatherCondition) {
    const conditionLower = weatherCondition.toLowerCase();
    
    if (conditionLower.includes('rain') || conditionLower.includes('pioggia'))
      faviconName = 'rain';
    else if (conditionLower.includes('cloud') || conditionLower.includes('cloudy') || conditionLower.includes('nuvoloso'))
      faviconName = 'cloudy';
    else if (conditionLower.includes('storm') || conditionLower.includes('thunder') || conditionLower.includes('temporale'))
      faviconName = 'storm';
    else if (conditionLower.includes('fog') || conditionLower.includes('mist') || conditionLower.includes('nebbia'))
      faviconName = 'foggy';
    else if (conditionLower.includes('snow') || conditionLower.includes('neve'))
      faviconName = 'snow';
    else if (conditionLower.includes('clear') || conditionLower.includes('sunny') || conditionLower.includes('sereno'))
      faviconName = isDay ? 'sunny' : 'night';
  } else if (pressure < 1000) {
    faviconName = 'storm';
  } else if (temp > 30) {
    faviconName = isDay ? 'hot' : 'night-hot';
  } else if (!isDay) {
    faviconName = 'night';
  }
  
  console.log(`Changing favicon to: ${faviconName}, description: ${descriptionText}, isDay: ${isDay}`);
  
  // Ottieni l'elemento favicon o creane uno nuovo se non esiste
  let favicon = document.getElementById('favicon');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.id = 'favicon';
    favicon.rel = 'icon';
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
    const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    existingFavicons.forEach(link => {
      if (link.id !== 'favicon') {
        document.head.removeChild(link);
      }
    });
    
    console.log(`Favicon impostato a: ${iconPath}`);
    
    // Verifica se l'icona esiste effettivamente (questo è asincrono)
    fetch(iconPath)
      .then(response => {
        if (response.ok) {
          console.log(`✅ Favicon trovato e caricato correttamente: ${iconPath}`);
        } else {
          console.warn(`⚠️ Favicon non trovato (status: ${response.status}): ${iconPath}`);
        }
      })
      .catch(error => {
        console.error(`❌ Errore nel controllo del favicon: ${error.message}`);
      });
    
    // Impostiamo un titolo fisso senza la descrizione meteo
    document.title = 'Meteo Murro';
  } catch (e) {
    console.error('Errore nel cambio favicon:', e);
    // Se fallisce, usa il favicon di default SVG
    favicon.href = `${process.env.PUBLIC_URL}/favicons/svg/favicon-sunny.svg?v=${new Date().getTime()}`;
    favicon.type = "image/svg+xml";
  }
}

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Tentativo di connessione al backend...');
        // Usa il nuovo endpoint unificato con URL dinamico da variabili d'ambiente
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/weather/all`);
        
        // Log dettagliato con focus sui dati statistici
        console.log('Dati ricevuti dal backend:', JSON.stringify(response.data, null, 2));
        console.log('Statistiche min/max ricevute:', JSON.stringify(response.data.stats, null, 2));
        
        // Verifica presenza di statistiche
        if (!response.data.stats) {
          console.warn('ATTENZIONE: Nessuna statistica min/max ricevuta dal backend');
        } else {
          // Conta quanti valori null ci sono nelle statistiche
          const statsValues = Object.values(response.data.stats);
          const nullValues = statsValues.filter(v => v === null).length;
          console.log(`Statistiche: ${nullValues} valori null su ${statsValues.length} totali`);
        }
        
        // Verifica presenza di osservazioni
        if (!response.data.current?.observations || response.data.current.observations.length === 0) {
          console.warn('ATTENZIONE: Nessuna osservazione corrente ricevuta');
        } else {
          console.log('Numero di osservazioni ricevute:', response.data.current.observations.length);
        }
        
        // Aggiungiamo un controllo specifico per l'umidità
        if (response.data.current?.observations?.length > 0) {
          const currentObs = response.data.current.observations[0];
          console.log('Verifica umidità:');
          console.log('- current.humidity:', currentObs.humidity);
          console.log('- current.metric.humidity:', currentObs.metric?.humidity);
          
          // Aggiungiamo un controllo per tutte le proprietà dell'osservazione
          console.log('Proprietà dell\'osservazione corrente:', Object.keys(currentObs).join(', '));
          if (currentObs.metric) {
            console.log('Proprietà di metric:', Object.keys(currentObs.metric).join(', '));
          }
        }
        
        setWeatherData(response.data);
        setError(null);
      } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
        let errorMessage = 'Impossibile caricare i dati meteo. ';
        
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {         
          errorMessage +=  `Il server non è raggiungibile. Assicurati che il server sia in esecuzione su ${process.env.REACT_APP_API_URL}`;
        } else if (err.response) {
          // Errore di risposta dal server (4xx, 5xx)
          errorMessage += `Errore del server: ${err.response.status} ${err.response.statusText}`;
        } else if (err.request) {
          // Nessuna risposta ricevuta
          errorMessage += 'Nessuna risposta dal server. Verifica la connessione di rete.';
        } else {
          // Altro tipo di errore
          errorMessage += `Dettagli: ${err.message}`;
        }
        
        setError(errorMessage);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000); // Aggiorna ogni 2 minuti
    return () => clearInterval(interval);
  }, []);

  // Aggiungiamo un useEffect per cambiare dinamicamente il favicon in base alle condizioni meteo
  useEffect(() => {
    if (weatherData?.current?.observations?.[0]) {
      const current = weatherData.current.observations[0];
      const metric = current.metric;
      
      if (metric) {
        // Otteniamo la condizione meteo, con un valore predefinito se non è specificata
        const condition = current.conditions || getDefaultCondition(metric.temp, metric.pressure);
        
        // Generiamo la descrizione meteo usando la stessa funzione usata per la pagina
        const description = getWeatherDescription(condition, metric.pressure, metric.temp, metric.humidity);
        
        console.log('Aggiornamento favicon con condizioni:', condition, 'descrizione:', description);
        
        // Chiamiamo la funzione per cambiare il favicon passando anche la descrizione
        changeFavicon(condition, metric.pressure, metric.temp, description);
      }
    }
  }, [weatherData]); // Esegui quando cambiano i dati meteo
  
  // Funzione per ottenere una condizione predefinita basata su temperatura e pressione
  function getDefaultCondition(temp, pressure) {
    if (pressure < 1000) return 'Temporale';
    if (temp > 30) return 'Molto caldo';
    if (temp > 25) return 'Soleggiato';
    if (temp > 15) return 'Sereno';
    return 'Sereno';
  }
  
  // Effetto immediato per impostare il favicon di default all'avvio
  useEffect(() => {
    // Imposta subito un favicon di default con un titolo fisso
    document.title = 'Meteo Murro';
    
    // Ottieni l'elemento favicon o creane uno nuovo se non esiste
    let favicon = document.getElementById('favicon');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.id = 'favicon';
      favicon.rel = 'icon';
      favicon.type = "image/svg+xml"; // Importante specificare il tipo per SVG
      document.head.appendChild(favicon);
    }
    
    // Controlla se è giorno o notte
    const isDay = isDayTime();
    
    // Usa un percorso assoluto con process.env.PUBLIC_URL
    const iconPath = `${process.env.PUBLIC_URL}/favicons/svg/favicon-${isDay ? 'sunny' : 'night'}.svg?v=${new Date().getTime()}`;
    favicon.href = iconPath;
    console.log(`Favicon iniziale impostato a: ${iconPath} (${isDay ? 'giorno' : 'notte'})`);
    
    // Esegui una pulizia rimuovendo qualsiasi favicon statico che potrebbe essere stato specificato in HTML
    const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    existingFavicons.forEach(link => {
      if (link.id !== 'favicon') {
        document.head.removeChild(link);
        console.log('Rimosso favicon statico precedente');
      }
    });
    
    // Verifica se l'icona esiste effettivamente (questo è asincrono)
    fetch(iconPath)
    fetch(iconPath)
      .then(response => {
        if (response.ok) {
          console.log(`✅ Favicon iniziale trovato e caricato correttamente: ${iconPath}`);
        } else {
          console.warn(`⚠️ Favicon iniziale non trovato (status: ${response.status}): ${iconPath}`);
        }
      })
      .catch(error => {
        console.error(`❌ Errore nel controllo del favicon iniziale: ${error.message}`);
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
              <p><strong>Errore:</strong> {error}</p>
              <p>Suggerimenti:</p>
              <ul>
                <li>Verifica che il server sia in esecuzione</li>
                <li>Controlla che non ci siano errori nella console del server</li>
                <li>La connessione all'API meteo potrebbe essere temporaneamente non disponibile</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  const weatherCondition = current.conditions || 'Clear';
  const weatherIcon = getWeatherIcon(weatherCondition, metric.pressure, metric.temp);
  const backgroundClass = getWeatherBackground(weatherCondition, metric.pressure, metric.temp);
  
  // Genera una descrizione dettagliata in italiano delle condizioni meteo
  const weatherDescriptionText = getWeatherDescription(weatherCondition, metric.pressure, metric.temp, metric.humidity);

  const lastUpdatedTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });


  return (
    <div className={`App ${backgroundClass}`}>
      <main className="dashboard">
        <div className="main-weather-card">
          <div className="card-header">
            <h2>Stazione Meteo Murro</h2>
            <div className="last-updated">Ultimo aggiornamento: {lastUpdatedTime}</div>
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
                  <span>Min: {stats.tempMin ? Math.round(stats.tempMin) : Math.round(metric.temp)}°C</span>
                  <span>Max: {stats.tempMax ? Math.round(stats.tempMax) : Math.round(metric.temp)}°C</span>
                </div>
              )}
              {current.conditions && (
                <div className="weather-condition">{current.conditions}</div>
              )}
              {current.obsTimeLocal && (
                <div className="weather-time">
                  {new Date(current.obsTimeLocal).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
          
          {/* Mostra la descrizione personalizzata del meteo */}
          <div className="weather-description">
            {weatherDescriptionText}
          </div>
          
          {/* Mostra una descrizione del tempo più dettagliata se disponibile */}
          {current?.weatherDescription && current.weatherDescription !== weatherDescriptionText && (
            <div className="weather-description">
              {current.weatherDescription}
            </div>
          )}
          
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
          />
          <WeatherMetric 
            icon={<WiBarometer />} 
            label="Pressione" 
            value={metric.pressure} 
            unit=" hPa" 
            min={stats?.pressureMin}
            max={stats?.pressureMax}
          />
          <WeatherMetric 
            icon={<WiWindy />} 
            label="Vento" 
            value={metric.windSpeed} 
            unit=" km/h" 
            min={stats?.windspeedMin}
            max={stats?.windspeedMax}
          />
          <WeatherMetric 
            icon={<WiWindy />} 
            label="Raffica"
            value={metric.windGust}
            unit=" km/h"
            min={stats?.windgustMin}
            max={stats?.windgustMax}
          />
          <WeatherMetric 
            icon={<WiUmbrella />} 
            label="Pioggia Oggi" 
            value={metric.precipTotal} 
            unit=" mm" 
            min={null} // La pioggia non ha un min/max giornaliero in questo contesto
            max={stats?.precipTotalMax} 
          />
           <WeatherMetric 
            icon={<WiThermometer />} 
            label="Punto di Rugiada" 
            value={metric.dewpt}
            unit="°C" 
            min={stats?.dewptMin}
            max={stats?.dewptMax}
          />
          <WeatherMetric 
            icon={<WiHot />} 
            label="Indice di Calore" 
            value={metric.heatIndex}
            unit="°C" 
            min={stats?.heatindexMin}
            max={stats?.heatindexMax}
          />
          <WeatherMetric 
            icon={<WiSnowflakeCold />} 
            label="Temperatura Percepita"
            value={metric.windChill}
            unit="°C"
            min={stats?.windchillMin}
            max={stats?.windchillMax}
          />          
        </div>
      </main>
    </div>
  );
}

export default App;
