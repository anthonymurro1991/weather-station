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
      humidityMin: currentHumidity,
      humidityMax: currentHumidity,
      pressureMin: currentMetric.pressure,
      pressureMax: currentMetric.pressure,
      windspeedMin: currentMetric.windSpeed,
      windspeedMax: currentMetric.windSpeed,
      precipTotalMax: currentMetric.precipTotal,
      dewptMin: currentMetric.dewpt,
      dewptMax: currentMetric.dewpt,
      heatindexMin: currentMetric.heatIndex,      
      heatindexMax: currentMetric.heatIndex,
      windchillMin: currentMetric.windChill,
      windchillMax: currentMetric.windChill,
      windgustMin: currentMetric.windGust,
      windgustMax: currentMetric.windGust,
    };
    
    if (observations.length > 0) {
      // Estrai le metriche da tutte le osservazioni
      const tempLows = observations.flatMap(o => o.metric.tempLow);
      const tempHighs = observations.flatMap(o => o.metric.tempHigh);        
      const pressureLows = observations.flatMap(o => o.metric.pressureMin);      
      const pressureHighs = observations.flatMap(o => o.metric.pressureMax);
      const windspeedLows = observations.flatMap(o => o.metric.windspeedLow);      
      const windspeedHighs = observations.flatMap(o => o.metric.windspeedHigh); 
      const windgustLows = observations.flatMap(o => o.metric.windgustLow);      
      const windgustHighs = observations.flatMap(o => o.metric.windgustHigh);       
      const dewptLows = observations.flatMap(o => o.metric.dewptLow);      
      const dewptHighs = observations.flatMap(o => o.metric.dewptHigh);
      const heatIndexLows = observations.flatMap(o => o.metric.heatIndexLow);      
      const heatIndexHighs = observations.flatMap(o => o.metric.heatIndexHigh);
      const windChillLows = observations.flatMap(o => o.metric.windchillLow);      
      const windChillHighs = observations.flatMap(o => o.metric.windchillHigh);
      const humidityLows = observations.flatMap(o => o.humidityLow);      
      const humidityHighs = observations.flatMap(o => o.humidityHigh);      
      const precipTotal = observations.flatMap(o => o.metric.precipTotal);
      const precipRate = observations.flatMap(o => o.metric.precipRate);

      // Calcola min/max per ogni metrica
      if (tempLows.length > 0) stats.tempMin = Math.min(...tempLows);      
      if (tempHighs.length > 0) stats.tempMax = Math.max(...tempHighs);
      
      if (pressureLows.length > 0) stats.pressureMin = Math.min(...pressureLows);
      if (pressureHighs.length > 0) stats.pressureMax = Math.max(...pressureHighs);
      
      if (windspeedLows.length > 0) stats.windspeedMin = Math.min(...windspeedLows);
      if (windspeedHighs.length > 0) stats.windspeedMax = Math.max(...windspeedHighs);
      
      if (windgustLows.length > 0) stats.windgustMin = Math.min(...windgustLows);
      if (windgustHighs.length > 0) stats.windgustMax = Math.max(...windgustHighs);
      
      if (dewptLows.length > 0) stats.dewptMin = Math.min(...dewptLows);
      if (dewptHighs.length > 0) stats.dewptMax = Math.max(...dewptHighs);
      
      if (heatIndexLows.length > 0) stats.heatindexMin = Math.min(...heatIndexLows);
      if (heatIndexHighs.length > 0) stats.heatindexMax = Math.max(...heatIndexHighs);
      
      if (windChillLows.length > 0) stats.windchillMin = Math.min(...windChillLows);
      if (windChillHighs.length > 0) stats.windchillMax = Math.max(...windChillHighs);
      
      if (humidityLows.length > 0) stats.humidityMin = Math.min(...humidityLows);
      if (humidityHighs.length > 0) stats.humidityMax = Math.max(...humidityHighs);
      
      if (precipTotal.length > 0) stats.precipTotal = Math.max(...precipTotal);
      if (precipRate.length > 0) stats.precipRate = Math.max(...precipRate);
      
      // Vediamo i risultati calcolati
      console.log('\n Statistiche min/max:');
      console.log(`- Temperatura: min=${stats.tempMin}, max=${stats.tempMax}`);
      console.log(`- Umidità: min=${stats.humidityMin}, max=${stats.humidityMax}`);
      console.log(`- Pressione: min=${stats.pressureMin}, max=${stats.pressureMax}`);
      console.log(`- Velocità vento: min=${stats.windspeedMin}, max=${stats.windspeedMax}`);
      console.log(`- Raffica di vento: min=${stats.windgustMin}, max=${stats.windgustMax}`);
      console.log(`- Punto di rugiada: min=${stats.dewptMin}, max=${stats.dewptMax}`);
      console.log(`- Indice di calore: min=${stats.heatindexMin}, max=${stats.heatindexMax}`);
      console.log(`- Chill del vento: min=${stats.windchillMin}, max=${stats.windchillMax}`);
      console.log(`- Precipitazioni totali: ${stats.precipTotal}`);
      console.log(`- Tasso di precipitazione: ${stats.precipRate}`);
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
