import express from 'express';
import axios from 'axios';
import cors from 'cors';
import * as dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configurazione CORS più specifica per la produzione
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://weather-frontend-9bsl.vercel.app'] 
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Usa variabili d'ambiente per configurazioni sensibili
const STATION_ID = process.env.STATION_ID || 'IBARIA12';
const API_KEY = process.env.WEATHER_API_KEY || '8b1e015fdac04f1b9e015fdac09f1b40';

// Helper to fetch current conditions
async function fetchCurrentWeather() {
  const url = `https://api.weather.com/v2/pws/observations/current?stationId=${STATION_ID}&format=json&units=m&apiKey=${API_KEY}`;
  console.log('Fetching current weather from:', url);
  const { data } = await axios.get(url);
  return data;
}

// Helper to fetch daily statistics (all observations for 1 day)
async function fetchDailyStats() {
  const url = `https://api.weather.com/v2/pws/observations/all/1day?stationId=${STATION_ID}&format=json&units=m&apiKey=${API_KEY}`;
  console.log('Fetching daily stats from:', url);
  const { data } = await axios.get(url);
  return data;
}

app.get('/api/weather/current', async (req, res) => {
  try {
    const data = await fetchCurrentWeather();
    res.json(data);
  } catch (err) {
    console.error('Error fetching current weather:', err.message);
    res.status(500).json({ error: 'Failed to fetch current weather', details: err.message });
  }
});

// New endpoint for daily stats (min/max/last)
app.get('/api/weather/stats', async (req, res) => {
  try {
    const data = await fetchDailyStats();
    const observations = data.observations || [];
    if (observations.length === 0) return res.status(404).json({ error: 'No data' });
    
    // Calcola min/max per tutti i valori disponibili
    const minmax = {
      tempMin: Math.min(...observations.map(o => o.metric?.temp).filter(v => v !== undefined)),
      tempMax: Math.max(...observations.map(o => o.metric?.temp).filter(v => v !== undefined)),
      humidityMin: Math.min(...observations.map(o => o.humidity).filter(v => v !== undefined)),
      humidityMax: Math.max(...observations.map(o => o.humidity).filter(v => v !== undefined)),
      pressureMin: Math.min(...observations.map(o => o.metric?.pressure).filter(v => v !== undefined)),
      pressureMax: Math.max(...observations.map(o => o.metric?.pressure).filter(v => v !== undefined)),
      windspeedMin: Math.min(...observations.map(o => o.metric?.windSpeed).filter(v => v !== undefined)),
      windspeedMax: Math.max(...observations.map(o => o.metric?.windSpeed).filter(v => v !== undefined)),
      windspeedavgMin: Math.min(...observations.map(o => o.metric?.windSpeedAvg).filter(v => v !== undefined)),
      windspeedavgMax: Math.max(...observations.map(o => o.metric?.windSpeedAvg).filter(v => v !== undefined)),
      windgustMin: Math.min(...observations.map(o => o.metric?.windGust).filter(v => v !== undefined)),
      windgustMax: Math.max(...observations.map(o => o.metric?.windGust).filter(v => v !== undefined)),
      precipTotalMin: Math.min(...observations.map(o => o.metric?.precipTotal).filter(v => v !== undefined)),
      precipTotalMax: Math.max(...observations.map(o => o.metric?.precipTotal).filter(v => v !== undefined)),
      dewptMin: Math.min(...observations.map(o => o.metric?.dewpt).filter(v => v !== undefined)),
      dewptMax: Math.max(...observations.map(o => o.metric?.dewpt).filter(v => v !== undefined)),
    };
    
    // Prendi l'ultimo record (più recente)
    const last = observations[observations.length - 1];
    res.json({ last, minmax });
  } catch (err) {
    console.error('Error fetching daily stats:', err.message);
    res.status(500).json({ error: 'Failed to fetch daily stats', details: err.message });
  }
});

// UNIFICATO: Endpoint che restituisce dati attuali e statistiche
app.get('/api/weather/all', async (req, res) => {
  try {
    // Chiamate in parallelo per efficienza
    const [currentData, statsData] = await Promise.all([
      fetchCurrentWeather(),
      fetchDailyStats()
    ]);

    // Log dei dati per debugging
    console.log('Dati correnti ricevuti:', JSON.stringify(currentData, null, 2).substring(0, 500) + '...');

    // Controlla la struttura completa dei dati statistici
    console.log('Struttura dei dati statistici ricevuti:');
    console.log('- Chiavi principali:', Object.keys(statsData));
    
    const observations = statsData.observations || [];
    console.log(`Numero di osservazioni trovate: ${observations.length}`);
      // Se ci sono osservazioni, esaminiamo la struttura di una di esse
    if (observations.length > 0) {
      const sampleObs = observations[0];
      console.log('Struttura di un\'osservazione:');
      console.log('- Chiavi principali:', Object.keys(sampleObs));
      
      if (sampleObs.metric) {
        console.log('- Chiavi in metric:', Object.keys(sampleObs.metric));
        
        // Verifica esplicita della presenza di campi high/low
        const highLowProps = Object.keys(sampleObs.metric).filter(key => 
          key.endsWith('High') || key.endsWith('Low')
        );
        
        if (highLowProps.length > 0) {
          console.log('- Proprietà high/low trovate:', highLowProps.join(', '));
          
          // Mostra i valori per alcune delle proprietà high/low più importanti
          for (const prop of highLowProps) {
            console.log(`  - ${prop}: ${sampleObs.metric[prop]} (${typeof sampleObs.metric[prop]})`);
          }
        } else {
          console.log('- Nessuna proprietà high/low trovata in metric');
        }
        
        // Log dei valori in metric per vedere i tipi di dati
        for (const [key, value] of Object.entries(sampleObs.metric)) {
          console.log(`  - ${key}: ${value} (${typeof value})`);
        }
      } else {
        console.log('- Campo metric non presente!');
      }
      
      // Controlla anche l'ultima osservazione che potrebbe avere più dati
      if (observations.length > 1) {
        const lastObs = observations[observations.length - 1];
        console.log('\nControllo anche l\'ultima osservazione per high/low:');
        
        if (lastObs.metric) {
          const highLowProps = Object.keys(lastObs.metric).filter(key => 
            key.endsWith('High') || key.endsWith('Low')
          );
          
          if (highLowProps.length > 0) {
            console.log('- Proprietà high/low trovate nell\'ultima osservazione:', highLowProps.join(', '));
          } else {
            console.log('- Nessuna proprietà high/low trovata nell\'ultima osservazione');
          }
        }
      }
    }
      // Ottieni i dati correnti per usarli come fallback se necessario
    const currentObs = currentData.observations && currentData.observations.length > 0 
      ? currentData.observations[0] 
      : null;
    
    const currentMetric = currentObs?.metric || {};
    
    // L'umidità potrebbe essere sia in metric che direttamente nell'oggetto
    const currentHumidity = currentObs?.humidity !== undefined 
      ? currentObs.humidity 
      : currentMetric?.humidity;
    
    console.log('Verifica umidità nel backend:');
    console.log('- currentObs.humidity:', currentObs?.humidity);
    console.log('- currentMetric.humidity:', currentMetric?.humidity);
    console.log('- currentHumidity (valore usato):', currentHumidity);
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
    };// Sovrascriviamo questi valori di default con i valori min/max calcolati dai minimi e massimi di ogni record
    if (observations.length > 0) {
      console.log(`Calcolando statistiche confrontando i min/max di ${observations.length} osservazioni...`);
      
      // Funzione di utility per verificare se un valore è valido
      const isValidValue = (v) => v !== undefined && v !== null && isFinite(v) && !isNaN(v);
      
      // Per ogni metrica, dobbiamo trovare:
      // - Il minimo tra tutti i valori "Low" di ogni record
      // - Il massimo tra tutti i valori "High" di ogni record
        // Estrai i valori min/max da ogni osservazione con supporto a nomi di campo alternativi
      // Cerca tutti i possibili nomi di campo per le temperature minime
      const tempLows = observations.flatMap(o => {
        if (!o.metric) return [];
        
        // Cerca diverse varianti di nomi di campo per la temperatura minima
        const possibleValues = [
          o.metric.tempLow,
          o.metric.temp_low,
          o.metric.temperatureLow,
          o.metric.temperature_low,
          o.metric.minTemp,
          o.metric.min_temp,
          o.metric.temp_min
        ];
        
        return possibleValues.filter(isValidValue);
      });
      
      // Cerca tutti i possibili nomi di campo per le temperature massime
      const tempHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        
        // Cerca diverse varianti di nomi di campo per la temperatura massima
        const possibleValues = [
          o.metric.tempHigh,
          o.metric.temp_high,
          o.metric.temperatureHigh,
          o.metric.temperature_high,
          o.metric.maxTemp,
          o.metric.max_temp,
          o.metric.temp_max
        ];
        
        return possibleValues.filter(isValidValue);
      });
        // Estrai i valori min/max per pressione con supporto a nomi di campo alternativi
      const pressureLows = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.pressureLow,
          o.metric.pressure_low,
          o.metric.minPressure,
          o.metric.min_pressure
        ].filter(isValidValue);
      });
      
      const pressureHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.pressureHigh,
          o.metric.pressure_high,
          o.metric.maxPressure,
          o.metric.max_pressure
        ].filter(isValidValue);
      });
        // Estrai i valori min/max per velocità vento con supporto a nomi di campo alternativi
      const windspeedLows = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.windspeedLow,
          o.metric.windSpeed_low,
          o.metric.windspeed_low,
          o.metric.minWindspeed,
          o.metric.minWindSpeed,
          o.metric.min_windspeed,
          o.metric.min_windSpeed
        ].filter(isValidValue);
      });
      
      const windspeedHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.windspeedHigh,
          o.metric.windSpeed_high,
          o.metric.windspeed_high,
          o.metric.maxWindspeed,
          o.metric.maxWindSpeed,
          o.metric.max_windspeed,
          o.metric.max_windSpeed
        ].filter(isValidValue);
      });
        // Estrai i valori min/max per raffiche di vento con supporto a nomi di campo alternativi
      const windgustLows = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.windgustLow,
          o.metric.windGust_low,
          o.metric.windgust_low,
          o.metric.minWindgust,
          o.metric.minWindGust,
          o.metric.min_windgust,
          o.metric.min_windGust
        ].filter(isValidValue);
      });
      
      const windgustHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.windgustHigh,
          o.metric.windGust_high,
          o.metric.windgust_high,
          o.metric.maxWindgust,
          o.metric.maxWindGust,
          o.metric.max_windgust,
          o.metric.max_windGust
        ].filter(isValidValue);
      });
        // Estrai i valori min/max per punto di rugiada con supporto a nomi di campo alternativi
      const dewptLows = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.dewptLow,
          o.metric.dewpt_low,
          o.metric.dewPoint_low,
          o.metric.dewPointLow,
          o.metric.minDewpt,
          o.metric.minDewPoint,
          o.metric.min_dewpt,
          o.metric.min_dewPoint
        ].filter(isValidValue);
      });
      
      const dewptHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.dewptHigh,
          o.metric.dewpt_high,
          o.metric.dewPoint_high,
          o.metric.dewPointHigh,
          o.metric.maxDewpt,
          o.metric.maxDewPoint,
          o.metric.max_dewpt,
          o.metric.max_dewPoint
        ].filter(isValidValue);
      });
        // Estrai i valori min/max per indice di calore con supporto a nomi di campo alternativi
      const heatIndexLows = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.heatIndexLow,
          o.metric.heatIndex_low,
          o.metric.heat_index_low,
          o.metric.minHeatIndex,
          o.metric.min_heatIndex,
          o.metric.min_heat_index
        ].filter(isValidValue);
      });
      
      const heatIndexHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.heatIndexHigh,
          o.metric.heatIndex_high,
          o.metric.heat_index_high,
          o.metric.maxHeatIndex,
          o.metric.max_heatIndex,
          o.metric.max_heat_index
        ].filter(isValidValue);
      });
        // Estrai i valori min/max per windchill con supporto a nomi di campo alternativi
      const windChillLows = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.windChillLow,
          o.metric.windChill_low,
          o.metric.wind_chill_low,
          o.metric.minWindChill,
          o.metric.min_windChill,
          o.metric.min_wind_chill
        ].filter(isValidValue);
      });
      
      const windChillHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.windChillHigh,
          o.metric.windChill_high,
          o.metric.wind_chill_high,
          o.metric.maxWindChill,
          o.metric.max_windChill,
          o.metric.max_wind_chill
        ].filter(isValidValue);
      });
        // Estrai i valori min/max per umidità con supporto a nomi di campo alternativi
      const humidityLows = observations.flatMap(o => {
        // L'umidità potrebbe essere sia in metric che direttamente nell'oggetto principale
        const fromMetric = o.metric ? [
          o.metric.humidityLow,
          o.metric.humidity_low,
          o.metric.minHumidity,
          o.metric.min_humidity
        ] : [];
        
        const fromRoot = [
          o.humidityLow,
          o.humidity_low,
          o.minHumidity,
          o.min_humidity
        ];
        
        return [...fromMetric, ...fromRoot].filter(isValidValue);
      });
      
      const humidityHighs = observations.flatMap(o => {
        // L'umidità potrebbe essere sia in metric che direttamente nell'oggetto principale
        const fromMetric = o.metric ? [
          o.metric.humidityHigh,
          o.metric.humidity_high,
          o.metric.maxHumidity,
          o.metric.max_humidity
        ] : [];
        
        const fromRoot = [
          o.humidityHigh,
          o.humidity_high,
          o.maxHumidity,
          o.max_humidity
        ];
        
        return [...fromMetric, ...fromRoot].filter(isValidValue);
      });
      
      // Estrai i valori max per precipitazioni totali con supporto a nomi di campo alternativi
      const precipTotalHighs = observations.flatMap(o => {
        if (!o.metric) return [];
        return [
          o.metric.precipTotalHigh,
          o.metric.precipTotal_high,
          o.metric.precip_total_high,
          o.metric.maxPrecipTotal,
          o.metric.max_precipTotal,
          o.metric.max_precip_total
        ].filter(isValidValue);
      });
        // Log del numero di valori trovati per ogni proprietà
      console.log('Numero di valori min/max trovati per ogni proprietà:');
      console.log(`- Temperatura: ${tempLows.length} lows, ${tempHighs.length} highs`);
      
      // Esempi di valori trovati per debug
      if (tempLows.length > 0) console.log(`  - Esempi tempLows: ${tempLows.slice(0, 3).join(', ')}...`);
      if (tempHighs.length > 0) console.log(`  - Esempi tempHighs: ${tempHighs.slice(0, 3).join(', ')}...`);
      
      console.log(`- Pressione: ${pressureLows.length} lows, ${pressureHighs.length} highs`);
      console.log(`- Velocità vento: ${windspeedLows.length} lows, ${windspeedHighs.length} highs`);
      console.log(`- Raffica di vento: ${windgustLows.length} lows, ${windgustHighs.length} highs`);
      console.log(`- Punto di rugiada: ${dewptLows.length} lows, ${dewptHighs.length} highs`);
      console.log(`- Indice di calore: ${heatIndexLows.length} lows, ${heatIndexHighs.length} highs`);
      console.log(`- Wind chill: ${windChillLows.length} lows, ${windChillHighs.length} highs`);
      console.log(`- Umidità: ${humidityLows.length} lows, ${humidityHighs.length} highs`);
      console.log(`- Pioggia totale: ${precipTotalHighs.length} highs`);
      
      // Funzione per trovare il minimo e massimo di un array di valori
      const findMinMax = (values) => {
        if (values.length === 0) return { min: null, max: null };
        return {
          min: Math.min(...values),
          max: Math.max(...values)
        };
      };
        // Calcola il vero min/max per ogni metrica
      if (tempLows.length > 0) {
        const calculatedMin = Math.min(...tempLows);
        console.log(`  - Calcolato tempMin: ${calculatedMin} (da ${tempLows.length} valori)`);
        stats.tempMin = calculatedMin;
      } else {
        console.log('  - Impossibile calcolare tempMin dai valori tempLow (nessun valore trovato)');
      }
      
      if (tempHighs.length > 0) {
        const calculatedMax = Math.max(...tempHighs);
        console.log(`  - Calcolato tempMax: ${calculatedMax} (da ${tempHighs.length} valori)`);
        stats.tempMax = calculatedMax;
      } else {
        console.log('  - Impossibile calcolare tempMax dai valori tempHigh (nessun valore trovato)');
      }
      
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
      
      if (precipTotalHighs.length > 0) stats.precipTotalMax = Math.max(...precipTotalHighs);
      
      // Vediamo i risultati calcolati
      console.log('Statistiche min/max calcolate:');
      console.log(`- Temperatura: min=${stats.tempMin}, max=${stats.tempMax}`);
      console.log(`- Umidità: min=${stats.humidityMin}, max=${stats.humidityMax}`);
      console.log(`- Pressione: min=${stats.pressureMin}, max=${stats.pressureMax}`);
      console.log(`- Velocità vento: min=${stats.windspeedMin}, max=${stats.windspeedMax}`);
      console.log(`- Raffica di vento: min=${stats.windgustMin}, max=${stats.windgustMax}`);
      
      // Se non abbiamo trovato sufficienti valori high/low, calcoliamo anche dai valori diretti come fallback
      const needsFallback = !stats.tempMin || !stats.tempMax || !stats.pressureMin || !stats.pressureMax;
      
      if (needsFallback) {
        console.log('Alcuni valori high/low mancanti, calcolo anche dai valori correnti come fallback...');
        
        // Funzione di utilità per filtrare valori validi e calcolare min/max
        const calculateMinMax = (values) => {
          const validValues = values.filter(isValidValue);
          if (validValues.length === 0) return { min: null, max: null };
          
          return {
            min: Math.min(...validValues),
            max: Math.max(...validValues)
          };
        };
        
        // Estrai i valori correnti per ogni metrica da tutte le osservazioni
        const tempValues = observations.map(o => o.metric?.temp).filter(isValidValue);
        const humidityValues = observations.map(o => o.humidity || o.metric?.humidity).filter(isValidValue);
        const pressureValues = observations.map(o => o.metric?.pressure).filter(isValidValue);
        const windSpeedValues = observations.map(o => o.metric?.windSpeed).filter(isValidValue);
        const precipTotalValues = observations.map(o => o.metric?.precipTotal).filter(isValidValue);
        const dewptValues = observations.map(o => o.metric?.dewpt).filter(isValidValue);
        const heatIndexValues = observations.map(o => o.metric?.heatIndex).filter(isValidValue);
        const windChillValues = observations.map(o => o.metric?.windChill).filter(isValidValue);
        const windGustValues = observations.map(o => o.metric?.windGust).filter(isValidValue);
        
        // Calcola min/max per ogni metrica che manca
        if (!stats.tempMin && tempValues.length > 0) stats.tempMin = Math.min(...tempValues);
        if (!stats.tempMax && tempValues.length > 0) stats.tempMax = Math.max(...tempValues);
        
        if (!stats.humidityMin && humidityValues.length > 0) stats.humidityMin = Math.min(...humidityValues);
        if (!stats.humidityMax && humidityValues.length > 0) stats.humidityMax = Math.max(...humidityValues);
        
        if (!stats.pressureMin && pressureValues.length > 0) stats.pressureMin = Math.min(...pressureValues);
        if (!stats.pressureMax && pressureValues.length > 0) stats.pressureMax = Math.max(...pressureValues);
        
        if (!stats.windspeedMin && windSpeedValues.length > 0) stats.windspeedMin = Math.min(...windSpeedValues);
        if (!stats.windspeedMax && windSpeedValues.length > 0) stats.windspeedMax = Math.max(...windSpeedValues);
        
        if (!stats.precipTotalMax && precipTotalValues.length > 0) stats.precipTotalMax = Math.max(...precipTotalValues);
        
        if (!stats.dewptMin && dewptValues.length > 0) stats.dewptMin = Math.min(...dewptValues);
        if (!stats.dewptMax && dewptValues.length > 0) stats.dewptMax = Math.max(...dewptValues);
        
        if (!stats.heatindexMin && heatIndexValues.length > 0) stats.heatindexMin = Math.min(...heatIndexValues);
        if (!stats.heatindexMax && heatIndexValues.length > 0) stats.heatindexMax = Math.max(...heatIndexValues);
        
        if (!stats.windchillMin && windChillValues.length > 0) stats.windchillMin = Math.min(...windChillValues);
        if (!stats.windchillMax && windChillValues.length > 0) stats.windchillMax = Math.max(...windChillValues);
        
        if (!stats.windgustMin && windGustValues.length > 0) stats.windgustMin = Math.min(...windGustValues);
        if (!stats.windgustMax && windGustValues.length > 0) stats.windgustMax = Math.max(...windGustValues);
        
        console.log('Statistiche dopo il fallback:');
        console.log(`- Temperatura: min=${stats.tempMin}, max=${stats.tempMax}`);
      }
    }
    
    // Verifica quanti valori null rimangono
    const nullValues = Object.values(stats).filter(v => v === null).length;
    console.log(`Statistiche finali: ${nullValues} valori null su ${Object.values(stats).length} totali`);
      
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
