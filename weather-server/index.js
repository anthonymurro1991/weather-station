import express from 'express';
import axios from 'axios';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://weather-frontend-9bsl.vercel.app'] 
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

const STATION_ID = process.env.STATION_ID || 'IBARIA12';
const API_KEY = process.env.WEATHER_API_KEY || '8b1e015fdac04f1b9e015fdac09f1b40';

// Helper to fetch current conditions
async function fetchCurrentWeather() {
  const url = `https://api.weather.com/v2/pws/observations/current?stationId=${STATION_ID}&format=json&units=m&apiKey=${API_KEY}`;
  console.log('\nFetching current weather from:', url);
  const { data } = await axios.get(url);
  return data;
}

// Helper to fetch daily statistics (all observations for 1 day)
async function fetchDailyStats() {
  const url = `https://api.weather.com/v2/pws/observations/all/1day?stationId=${STATION_ID}&format=json&units=m&apiKey=${API_KEY}`;
  console.log('\nFetching daily stats from:', url);
  const { data } = await axios.get(url);
  return data;
}

app.get('/api/weather/all', async (req, res) => {
  try {
    const [currentData, statsData] = await Promise.all([
      fetchCurrentWeather(),
      fetchDailyStats()
    ]);
    
    const observations = statsData.observations || [];
    console.log(`\nMetriche trovate: ${observations.length}`);

    const currentObs = currentData.observations && currentData.observations.length > 0 
      ? currentData.observations[0] 
      : null;
    
    const currentMetric = currentObs?.metric || {};

    const currentHumidity = currentObs?.humidity !== undefined 
      ? currentObs.humidity 
      : currentMetric?.humidity;

    // Inizializza le statistiche con valori predefiniti dai dati correnti
    let stats = {
      tempMin: currentMetric.temp,
      tempMax: currentMetric.temp,
      tempMinTime: currentObs?.obsTimeLocal,
      tempMaxTime: currentObs?.obsTimeLocal,
      humidityMin: currentHumidity,
      humidityMax: currentHumidity,
      humidityMinTime: currentObs?.obsTimeLocal,
      humidityMaxTime: currentObs?.obsTimeLocal,
      pressureMin: currentMetric.pressure,
      pressureMax: currentMetric.pressure,
      pressureMinTime: currentObs?.obsTimeLocal,
      pressureMaxTime: currentObs?.obsTimeLocal,
      windspeedMin: currentMetric.windSpeed,
      windspeedMax: currentMetric.windSpeed,
      windspeedMinTime: currentObs?.obsTimeLocal,
      windspeedMaxTime: currentObs?.obsTimeLocal,
      precipTotalMax: currentMetric.precipTotal,
      precipTotalMaxTime: currentObs?.obsTimeLocal,
      dewptMin: currentMetric.dewpt,
      dewptMax: currentMetric.dewpt,
      dewptMinTime: currentObs?.obsTimeLocal,
      dewptMaxTime: currentObs?.obsTimeLocal,
      heatindexMin: currentMetric.heatIndex,      
      heatindexMax: currentMetric.heatIndex,
      heatindexMinTime: currentObs?.obsTimeLocal,
      heatindexMaxTime: currentObs?.obsTimeLocal,
      windchillMin: currentMetric.windChill,
      windchillMax: currentMetric.windChill,
      windchillMinTime: currentObs?.obsTimeLocal,
      windchillMaxTime: currentObs?.obsTimeLocal,
      windgustMin: currentMetric.windGust,
      windgustMax: currentMetric.windGust,
      windgustMinTime: currentObs?.obsTimeLocal,
      windgustMaxTime: currentObs?.obsTimeLocal,
    };
    
    if (observations.length > 0) {
      // Funzione helper per trovare min/max con timestamp
      const findMinMaxWithTime = (observations, getValue, obsTimeKey = 'obsTimeLocal') => {
        const validObs = observations.filter(obs => {
          const value = getValue(obs);
          return value !== null && value !== undefined && !isNaN(value);
        });
        
        if (validObs.length === 0) return { min: null, max: null, minTime: null, maxTime: null };
        
        let minObs = validObs[0];
        let maxObs = validObs[0];
        let minValue = getValue(minObs);
        let maxValue = getValue(maxObs);
        
        for (const obs of validObs) {
          const value = getValue(obs);
          if (value < minValue) {
            minValue = value;
            minObs = obs;
          }
          if (value > maxValue) {
            maxValue = value;
            maxObs = obs;
          }
        }
        
        return {
          min: minValue,
          max: maxValue,
          minTime: minObs[obsTimeKey],
          maxTime: maxObs[obsTimeKey]
        };
      };

      // Estrai le osservazioni che hanno i dati necessari
      const allObservations = observations.flatMap(o => {
        const result = [];
        
        // Per ogni tipo di dato, crea un'osservazione separata se il valore esiste
        if (o.metric.tempLow !== undefined && o.metric.tempLow !== null) {
          result.push({ value: o.metric.tempLow, obsTimeLocal: o.obsTimeLocal, type: 'tempLow' });
        }
        if (o.metric.tempHigh !== undefined && o.metric.tempHigh !== null) {
          result.push({ value: o.metric.tempHigh, obsTimeLocal: o.obsTimeLocal, type: 'tempHigh' });
        }
        if (o.metric.pressureMin !== undefined && o.metric.pressureMin !== null) {
          result.push({ value: o.metric.pressureMin, obsTimeLocal: o.obsTimeLocal, type: 'pressureMin' });
        }
        if (o.metric.pressureMax !== undefined && o.metric.pressureMax !== null) {
          result.push({ value: o.metric.pressureMax, obsTimeLocal: o.obsTimeLocal, type: 'pressureMax' });
        }
        if (o.metric.windspeedLow !== undefined && o.metric.windspeedLow !== null) {
          result.push({ value: o.metric.windspeedLow, obsTimeLocal: o.obsTimeLocal, type: 'windspeedLow' });
        }
        if (o.metric.windspeedHigh !== undefined && o.metric.windspeedHigh !== null) {
          result.push({ value: o.metric.windspeedHigh, obsTimeLocal: o.obsTimeLocal, type: 'windspeedHigh' });
        }
        if (o.metric.windgustLow !== undefined && o.metric.windgustLow !== null) {
          result.push({ value: o.metric.windgustLow, obsTimeLocal: o.obsTimeLocal, type: 'windgustLow' });
        }
        if (o.metric.windgustHigh !== undefined && o.metric.windgustHigh !== null) {
          result.push({ value: o.metric.windgustHigh, obsTimeLocal: o.obsTimeLocal, type: 'windgustHigh' });
        }
        if (o.metric.dewptLow !== undefined && o.metric.dewptLow !== null) {
          result.push({ value: o.metric.dewptLow, obsTimeLocal: o.obsTimeLocal, type: 'dewptLow' });
        }
        if (o.metric.dewptHigh !== undefined && o.metric.dewptHigh !== null) {
          result.push({ value: o.metric.dewptHigh, obsTimeLocal: o.obsTimeLocal, type: 'dewptHigh' });
        }
        if (o.metric.heatIndexLow !== undefined && o.metric.heatIndexLow !== null) {
          result.push({ value: o.metric.heatIndexLow, obsTimeLocal: o.obsTimeLocal, type: 'heatIndexLow' });
        }
        if (o.metric.heatIndexHigh !== undefined && o.metric.heatIndexHigh !== null) {
          result.push({ value: o.metric.heatIndexHigh, obsTimeLocal: o.obsTimeLocal, type: 'heatIndexHigh' });
        }
        if (o.metric.windchillLow !== undefined && o.metric.windchillLow !== null) {
          result.push({ value: o.metric.windchillLow, obsTimeLocal: o.obsTimeLocal, type: 'windchillLow' });
        }
        if (o.metric.windchillHigh !== undefined && o.metric.windchillHigh !== null) {
          result.push({ value: o.metric.windchillHigh, obsTimeLocal: o.obsTimeLocal, type: 'windchillHigh' });
        }
        if (o.humidityLow !== undefined && o.humidityLow !== null) {
          result.push({ value: o.humidityLow, obsTimeLocal: o.obsTimeLocal, type: 'humidityLow' });
        }
        if (o.humidityHigh !== undefined && o.humidityHigh !== null) {
          result.push({ value: o.humidityHigh, obsTimeLocal: o.obsTimeLocal, type: 'humidityHigh' });
        }
        if (o.metric.precipTotal !== undefined && o.metric.precipTotal !== null) {
          result.push({ value: o.metric.precipTotal, obsTimeLocal: o.obsTimeLocal, type: 'precipTotal' });
        }
        
        return result;
      });

      // Calcola min/max per ogni metrica con timestamp
      const tempLowObs = allObservations.filter(obs => obs.type === 'tempLow');
      const tempHighObs = allObservations.filter(obs => obs.type === 'tempHigh');
      const tempMinResult = findMinMaxWithTime(tempLowObs, obs => obs.value);
      const tempMaxResult = findMinMaxWithTime(tempHighObs, obs => obs.value);
      
      if (tempMinResult.min !== null) {
        stats.tempMin = tempMinResult.min;
        stats.tempMinTime = tempMinResult.minTime;
      }
      if (tempMaxResult.max !== null) {
        stats.tempMax = tempMaxResult.max;
        stats.tempMaxTime = tempMaxResult.maxTime;
      }

      // Pressione
      const pressureLowObs = allObservations.filter(obs => obs.type === 'pressureMin');
      const pressureHighObs = allObservations.filter(obs => obs.type === 'pressureMax');
      const pressureMinResult = findMinMaxWithTime(pressureLowObs, obs => obs.value);
      const pressureMaxResult = findMinMaxWithTime(pressureHighObs, obs => obs.value);
      
      if (pressureMinResult.min !== null) {
        stats.pressureMin = pressureMinResult.min;
        stats.pressureMinTime = pressureMinResult.minTime;
      }
      if (pressureMaxResult.max !== null) {
        stats.pressureMax = pressureMaxResult.max;
        stats.pressureMaxTime = pressureMaxResult.maxTime;
      }

      // Velocità del vento
      const windspeedLowObs = allObservations.filter(obs => obs.type === 'windspeedLow');
      const windspeedHighObs = allObservations.filter(obs => obs.type === 'windspeedHigh');
      const windspeedMinResult = findMinMaxWithTime(windspeedLowObs, obs => obs.value);
      const windspeedMaxResult = findMinMaxWithTime(windspeedHighObs, obs => obs.value);
      
      if (windspeedMinResult.min !== null) {
        stats.windspeedMin = windspeedMinResult.min;
        stats.windspeedMinTime = windspeedMinResult.minTime;
      }
      if (windspeedMaxResult.max !== null) {
        stats.windspeedMax = windspeedMaxResult.max;
        stats.windspeedMaxTime = windspeedMaxResult.maxTime;
      }

      // Raffica di vento
      const windgustLowObs = allObservations.filter(obs => obs.type === 'windgustLow');
      const windgustHighObs = allObservations.filter(obs => obs.type === 'windgustHigh');
      const windgustMinResult = findMinMaxWithTime(windgustLowObs, obs => obs.value);
      const windgustMaxResult = findMinMaxWithTime(windgustHighObs, obs => obs.value);
      
      if (windgustMinResult.min !== null) {
        stats.windgustMin = windgustMinResult.min;
        stats.windgustMinTime = windgustMinResult.minTime;
      }
      if (windgustMaxResult.max !== null) {
        stats.windgustMax = windgustMaxResult.max;
        stats.windgustMaxTime = windgustMaxResult.maxTime;
      }

      // Punto di rugiada
      const dewptLowObs = allObservations.filter(obs => obs.type === 'dewptLow');
      const dewptHighObs = allObservations.filter(obs => obs.type === 'dewptHigh');
      const dewptMinResult = findMinMaxWithTime(dewptLowObs, obs => obs.value);
      const dewptMaxResult = findMinMaxWithTime(dewptHighObs, obs => obs.value);
      
      if (dewptMinResult.min !== null) {
        stats.dewptMin = dewptMinResult.min;
        stats.dewptMinTime = dewptMinResult.minTime;
      }
      if (dewptMaxResult.max !== null) {
        stats.dewptMax = dewptMaxResult.max;
        stats.dewptMaxTime = dewptMaxResult.maxTime;
      }

      // Indice di calore
      const heatIndexLowObs = allObservations.filter(obs => obs.type === 'heatIndexLow');
      const heatIndexHighObs = allObservations.filter(obs => obs.type === 'heatIndexHigh');
      const heatIndexMinResult = findMinMaxWithTime(heatIndexLowObs, obs => obs.value);
      const heatIndexMaxResult = findMinMaxWithTime(heatIndexHighObs, obs => obs.value);
      
      if (heatIndexMinResult.min !== null) {
        stats.heatindexMin = heatIndexMinResult.min;
        stats.heatindexMinTime = heatIndexMinResult.minTime;
      }
      if (heatIndexMaxResult.max !== null) {
        stats.heatindexMax = heatIndexMaxResult.max;
        stats.heatindexMaxTime = heatIndexMaxResult.maxTime;
      }

      // Wind chill
      const windchillLowObs = allObservations.filter(obs => obs.type === 'windchillLow');
      const windchillHighObs = allObservations.filter(obs => obs.type === 'windchillHigh');
      const windchillMinResult = findMinMaxWithTime(windchillLowObs, obs => obs.value);
      const windchillMaxResult = findMinMaxWithTime(windchillHighObs, obs => obs.value);
      
      if (windchillMinResult.min !== null) {
        stats.windchillMin = windchillMinResult.min;
        stats.windchillMinTime = windchillMinResult.minTime;
      }
      if (windchillMaxResult.max !== null) {
        stats.windchillMax = windchillMaxResult.max;
        stats.windchillMaxTime = windchillMaxResult.maxTime;
      }

      // Umidità
      const humidityLowObs = allObservations.filter(obs => obs.type === 'humidityLow');
      const humidityHighObs = allObservations.filter(obs => obs.type === 'humidityHigh');
      const humidityMinResult = findMinMaxWithTime(humidityLowObs, obs => obs.value);
      const humidityMaxResult = findMinMaxWithTime(humidityHighObs, obs => obs.value);
      
      if (humidityMinResult.min !== null) {
        stats.humidityMin = humidityMinResult.min;
        stats.humidityMinTime = humidityMinResult.minTime;
      }
      if (humidityMaxResult.max !== null) {
        stats.humidityMax = humidityMaxResult.max;
        stats.humidityMaxTime = humidityMaxResult.maxTime;
      }

      // Precipitazioni totali (solo max)
      const precipTotalObs = allObservations.filter(obs => obs.type === 'precipTotal');
      const precipTotalResult = findMinMaxWithTime(precipTotalObs, obs => obs.value);
      
      if (precipTotalResult.max !== null) {
        stats.precipTotalMax = precipTotalResult.max;
        stats.precipTotalMaxTime = precipTotalResult.maxTime;
      }
      
      // Vediamo i risultati calcolati
      console.log('\n Statistiche min/max con timestamp:');
      console.log(`- Temperatura: min=${stats.tempMin} (${stats.tempMinTime}), max=${stats.tempMax} (${stats.tempMaxTime})`);
      console.log(`- Umidità: min=${stats.humidityMin} (${stats.humidityMinTime}), max=${stats.humidityMax} (${stats.humidityMaxTime})`);
      console.log(`- Pressione: min=${stats.pressureMin} (${stats.pressureMinTime}), max=${stats.pressureMax} (${stats.pressureMaxTime})`);
      console.log(`- Velocità vento: min=${stats.windspeedMin} (${stats.windspeedMinTime}), max=${stats.windspeedMax} (${stats.windspeedMaxTime})`);
      console.log(`- Raffica di vento: min=${stats.windgustMin} (${stats.windgustMinTime}), max=${stats.windgustMax} (${stats.windgustMaxTime})`);
      console.log(`- Punto di rugiada: min=${stats.dewptMin} (${stats.dewptMinTime}), max=${stats.dewptMax} (${stats.dewptMaxTime})`);
      console.log(`- Indice di calore: min=${stats.heatindexMin} (${stats.heatindexMinTime}), max=${stats.heatindexMax} (${stats.heatindexMaxTime})`);
      console.log(`- Chill del vento: min=${stats.windchillMin} (${stats.windchillMinTime}), max=${stats.windchillMax} (${stats.windchillMaxTime})`);
      console.log(`- Precipitazioni totali: ${stats.precipTotalMax} (${stats.precipTotalMaxTime})`);
    }
    
    // Verifica quanti valori null rimangono
    const nullValues = Object.values(stats).filter(v => v === null).length;
    console.log(`\nStatistiche finali: ${nullValues} valori null su ${Object.values(stats).length} totali`);
      
    // --- Risposta Unificata ---
    res.json({
      current: currentData,
      stats
    });

  } catch (err) {
    console.error('Error fetching unified weather data:', err.message);
    res.status(500).json({ error: 'Failed to fetch unified weather data', details: err.message });
  }
});

// Endpoint di base per verificare che il server sia attivo
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Meteo Murro API Server',
    endpoints: {
      current: '/api/weather/current',
      allDay: '/api/weather/daily',
      unified: '/api/weather/all'
    },
    version: '1.0.0'
  });
});

// Gestione 404 per endpoint non esistenti
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'L\'endpoint richiesto non esiste'
  });
});

app.listen(PORT, () => {
  console.log(`Meteo Murro API server in esecuzione sulla porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Stazione meteo: ${STATION_ID}`);
});
