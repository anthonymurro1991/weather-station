# Modifiche necessarie al backend per il deployment

1. Aggiungi gestione CORS per permettere richieste dal tuo dominio frontend
2. Usa variabili d'ambiente per configurazioni sensibili come la API key
3. Gestisci la porta in modo dinamico per compatibilità con servizi di hosting

## Esempio di configurazione per index.js

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4000;

// Configura CORS per produzione
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tuo-frontend-url.com'] // URL specifici in produzione
    : '*' // Qualsiasi origine in sviluppo
}));

// Usa variabili d'ambiente per le credenziali
const API_KEY = process.env.WEATHER_API_KEY || '8b1e015fdac04f1b9e015fdac09f1b40';
const STATION_ID = process.env.STATION_ID || 'IBARIA12';
```

## File .env per il backend
```
PORT=4000
WEATHER_API_KEY=8b1e015fdac04f1b9e015fdac09f1b40
STATION_ID=IBARIA12
NODE_ENV=development
```
