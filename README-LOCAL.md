# Guida all'esecuzione locale dell'applicazione Meteo Murro

Questa guida ti aiuterà a far funzionare l'applicazione Meteo Murro sul tuo computer locale.

## Prerequisiti

Prima di iniziare, assicurati di avere installato sul tuo computer:

1. **Node.js** (versione 18 o superiore) - [Scarica da nodejs.org](https://nodejs.org/)
2. **npm** (viene installato automaticamente con Node.js)

## Metodo 1: Utilizzo dello script automatico (Windows)

Il modo più semplice per avviare l'applicazione è utilizzare lo script batch fornito:

1. Nella cartella principale del progetto, fai doppio clic su `start-local.bat`
2. Si apriranno due finestre di comando:
   - Una per il backend (server Node.js)
   - Una per il frontend (applicazione React)
3. Il browser si aprirà automaticamente all'indirizzo http://localhost:3000

## Metodo 2: Avvio manuale dei servizi

Se preferisci avviare i servizi manualmente o non utilizzi Windows, segui questi passaggi:

### Passo 1: Avviare il backend (server Node.js)

1. Apri una finestra di comando/terminale
2. Naviga alla cartella del server:
   ```
   cd /percorso/al/progetto/weather-murro/weather-server
   ```
3. Installa le dipendenze (solo la prima volta):
   ```
   npm install
   ```
4. Avvia il server:
   ```
   node index.js
   ```
5. Dovresti vedere un messaggio che conferma che il server è in esecuzione sulla porta 4000

### Passo 2: Avviare il frontend (applicazione React)

1. Apri una **nuova** finestra di comando/terminale
2. Naviga alla cartella del frontend:
   ```
   cd /percorso/al/progetto/weather-murro/weather-frontend
   ```
3. Installa le dipendenze (solo la prima volta):
   ```
   npm install
   ```
4. Avvia l'applicazione React:
   ```
   npm start
   ```
5. Il browser si aprirà automaticamente con l'applicazione all'indirizzo http://localhost:3000

## Accesso all'applicazione

Una volta avviati entrambi i servizi:

- **Frontend (interfaccia utente)**: http://localhost:3000
- **Backend (API)**: http://localhost:4000

## Risoluzione dei problemi

### Il frontend non riesce a connettersi al backend

Assicurati che:

1. Il server backend sia in esecuzione (controlla la finestra di comando)
2. La porta 4000 non sia bloccata da un firewall
3. Il file `.env.development` nella cartella frontend contenga:
   ```
   REACT_APP_API_URL=http://localhost:4000
   ```

### Errore "address already in use"

Se ricevi un errore che indica che la porta è già in uso:

1. Trova il processo che sta utilizzando la porta:
   - Windows: `netstat -ano | findstr :4000` o `netstat -ano | findstr :3000`
   - Mac/Linux: `lsof -i :4000` o `lsof -i :3000`
2. Termina quel processo o scegli un'altra porta modificando i file di configurazione

### Permessi di esecuzione su PowerShell

Se PowerShell mostra errori relativi alle policy di esecuzione, puoi:

1. Eseguire PowerShell come amministratore
2. Eseguire il comando: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
3. Oppure utilizzare il prompt dei comandi (cmd) invece di PowerShell

---

## Come vengono calcolati descrizione e icona

L'aspetto visivo dell'app (icona, sfondo, favicon) e la descrizione testuale del tempo sono calcolati interamente lato server, senza usare il campo `conditions` dell'API Weather.com (spesso assente nelle stazioni personali). La logica è distribuita su quattro file in `weather-server/src/`:

### 1. `trendCalculator.js` — ΔP nelle ultime 3 ore

A ogni richiesta, il server analizza le osservazioni delle ultime 24 ore (una ogni ~5 minuti). Confronta la pressione media degli ultimi 30 minuti con quella di circa 3 ore fa, calcolando **ΔP₃h** in hPa (positivo = pressione in salita, negativo = in calo).

### 2. `descriptionCalculator.js` — classificazione e descrizione

La funzione `classifyFromMetrics()` riceve cinque parametri e produce una **categoria canonica**:

| Parametro         | Significato                               |
| ----------------- | ----------------------------------------- |
| `pressure`        | Pressione attuale in hPa                  |
| `temp`            | Temperatura in °C                         |
| `humidity`        | Umidità relativa in %                     |
| `dewpt`           | Punto di rugiada in °C                    |
| `precipRate`      | Tasso di precipitazione in mm/h           |
| `pressureDelta3h` | ΔP nelle ultime 3h (da `trendCalculator`) |

**Priorità di classificazione (dall'alto verso il basso):**

1. **Precipitazioni misurate** (`precipRate > 0`) → `drizzle` o `rain`
2. **Neve** (temp ≤ 2°C + umidità ≥ 80%) → `snow`
3. **Temporale** (pressione < 990 hPa) → `storm`
4. **Nebbia** (spread temp−dewpt ≤ 2°C + umidità ≥ 90%) → `fog`
5. **Maltempo certo** (pressione < 1000 hPa) → `overcast`
6. **Classificazione P + ΔP + RH** (tre zone):

| Zona       | Pressione     | Condizione             | Risultato                                  |
| ---------- | ------------- | ---------------------- | ------------------------------------------ |
| Alta       | > 1018 hPa    | ΔP ≥ 0 e RH < 60%      | `clear` (sereno)                           |
| Alta       | > 1018 hPa    | RH < 70%               | `clear` (sereno)                           |
| Alta       | > 1018 hPa    | RH ≥ 70%               | `cloudy-partly` (parzialmente nuvoloso)    |
| Intermedia | 1008–1018 hPa | ΔP > +2 e RH < 65%     | `clear` (sereno, miglioramento in corso)   |
| Intermedia | 1008–1018 hPa | \|ΔP\| ≤ 1 e RH 60–85% | `cloudy-partly` (parzialmente nuvoloso)    |
| Intermedia | 1008–1018 hPa | ΔP < −3 e RH ≥ 75%     | `overcast` (cielo coperto)                 |
| Intermedia | 1008–1018 hPa | ΔP < −1 e RH ≥ 80%     | `cloudy-mostly` (prevalentemente nuvoloso) |
| Bassa      | 1000–1008 hPa | ΔP < −1 e RH > 80%     | `overcast` (cielo coperto)                 |
| Bassa      | 1000–1008 hPa | RH ≥ 65%               | `cloudy-mostly` (prevalentemente nuvoloso) |
| Bassa      | 1000–1008 hPa | altrimenti             | `cloudy-partly` (parzialmente nuvoloso)    |

La funzione `getWeatherDescription()` converte poi la categoria in una **frase in italiano**, tenendo conto di giorno/notte e temperatura (es. `"Cielo sereno e soleggiato"`, `"Prevalentemente nuvoloso, pioggia probabile"`).

### 3. `conditionClassifier.js` — categoria dall'italiano

`classifyFromDescription()` rilegge il testo prodotto nel passo precedente e ri-deriva la categoria canonica tramite corrispondenza di parole chiave. Questo garantisce che icona, sfondo e favicon siano **sempre allineati** alla descrizione mostrata all'utente.

### 4. `trendCalculator.js` — probabilità di pioggia su tre orizzonti

`computeRainProbability()` usa un **sistema a punteggio** (score) che combina quattro segnali e restituisce tre percentuali distinte:

| Campo JSON           | Significato                              |
| -------------------- | ---------------------------------------- |
| `rainProbability`    | Rischio corrente (condizioni istantanee) |
| `rainProbability3h`  | Probabilità pioggia entro 3 ore          |
| `rainProbability12h` | Probabilità pioggia entro 12 ore         |

**Segnali usati nel calcolo:**

| Segnale                       | Contributo al punteggio                                   |
| ----------------------------- | --------------------------------------------------------- |
| **ΔP₃h** (segnale principale) | < −5 hPa → +5pt · < −3 → +4pt · < −1 → +2pt · > +1 → −2pt |
| **Pressione assoluta**        | < 1000 hPa → +3pt · < 1010 → +2pt · > 1020 e ΔP≥0 → −3pt  |
| **Umidità relativa**          | > 90% → +3pt · > 80% → +2pt · < 60% → −1pt                |
| **Spread T − dewpt**          | < 2°C → +2pt · < 5°C → +1pt · > 15°C → −1pt               |

**Tabella score → probabilità:**

| Score | Probabilità corrente | Entro 3h | Entro 12h |
| ----- | -------------------- | -------- | --------- |
| ≤ 0   | 5%                   | 3%       | 10%       |
| 1     | 15%                  | 8%       | 20%       |
| 2     | 25%                  | 15%      | 32%       |
| 3     | 40%                  | 25%      | 48%       |
| 4     | 55%                  | 38%      | 62%       |
| 5     | 68%                  | 52%      | 74%       |
| 6     | 78%                  | 65%      | 83%       |
| ≥ 7   | 87–93%               | 78–90%   | 90–95%    |

Per `rainProbability3h` il peso di ΔP₃h rapido è aumentato (calo > −5 hPa vale +6pt). Per `rainProbability12h` lo score base viene corretto anche con il trend 12h (`pressureTrend`) e il trend dell'umidità.

**In parole povere:**

Il sistema guarda quattro cose contemporaneamente e assegna un "punteggio di rischio pioggia":

- **La pressione sta calando velocemente?** → È il segnale più importante. Un calo rapido nelle ultime 3 ore significa che sta arrivando una perturbazione. Più è veloce, più punti si aggiungono.
- **La pressione è già bassa?** → Sotto 1010 hPa l'atmosfera è già instabile, sotto 1000 è quasi certamente perturbata.
- **L'aria è umida?** → Sopra il 80–90% di umidità l'aria è quasi satura: basta poco per far piovere.
- **La temperatura è vicina al punto di rugiada?** → Se la differenza è meno di 2–5°C, l'aria condensa facilmente e la pioggia è molto più probabile.

I tre valori restituiti si distinguono così:

- **`rainProbability`** = rischio adesso, basato sulle condizioni istantanee
- **`rainProbability3h`** = probabilità nelle prossime 3 ore, dove un calo di pressione rapido pesa molto di più (la perturbazione è già in arrivo)
- **`rainProbability12h`** = probabilità nelle prossime 12 ore, dove si aggiunge anche il trend generale di pressione e umidità nelle ultime 12 ore

### 5. `iconCalculator.js` — icona, sfondo e favicon

Dalla categoria canonica vengono estratti tre valori:

| Categoria                                    | `iconName`        | `backgroundClass` (giorno)                   | `faviconName`             |
| -------------------------------------------- | ----------------- | -------------------------------------------- | ------------------------- |
| `clear`                                      | `sunny` / `night` | `weather-bg-sunny`, `-mild`, `-hot`, `-cool` | `sunny` / `night` / `hot` |
| `cloudy-partly`, `cloudy-mostly`, `overcast` | `cloud`           | `weather-bg-cloudy`                          | `cloudy`                  |
| `rain`, `drizzle`                            | `rain`            | `weather-bg-rain`                            | `rain`                    |
| `storm`                                      | `storm`           | `weather-bg-storm`                           | `storm`                   |
| `fog`                                        | `fog`             | `weather-bg-foggy`                           | `foggy`                   |
| `snow`                                       | `snow`            | —                                            | `snow`                    |

Tutti i valori calcolati vengono inclusi nel JSON restituito dall'endpoint `GET /api/weather/all` e letti direttamente dal frontend React.

---

## Come funziona lo Storm Tracker

Lo Storm Tracker è un pannello che, ogni 2 minuti, controlla se c'è un temporale in arrivo in un raggio di 50 km attorno alla stazione e stima distanza, direzione, velocità, tendenza, tempo di arrivo, rischio grandine e raffiche stimate.

**In parole semplici:** è come avere un amico che guarda il cielo intorno a casa ogni 2 minuti e ti dice se c'è pioggia/temporale nei dintorni, da che parte si trova, se si sta avvicinando o allontanando, se sta peggiorando o migliorando, e — se punta verso di te — tra quanto tempo arriva.

**Limiti dichiarati (nessuna funzionalità nascosta o esagerata):**

- **Grandine**: è una stima euristica basata su CAPE/codice meteo/zero termico, non una rilevazione radar diretta.
- **Raffiche**: è il forecast orario diretto di Open-Meteo (`wind_gusts_10m`), non una stima nostra né una misura reale.
- **Non è un radar pixel-per-pixel**: usa dati di precipitazione numerici (Open-Meteo) campionati su una griglia di punti, non immagini radar vere. Risoluzione tipica ~16 km.
- **Fulmini**: non inclusi. Non esiste una fonte gratuita e ufficiale di dati fulmini in tempo reale, quindi il campo è stato rimosso invece di mostrare un placeholder sempre vuoto.
- **Posizione cella**: il nome della località è approssimativo (reverse geocoding gratuito OpenStreetMap/Nominatim, livello città/paese), coerente con la risoluzione reale della griglia (~16 km). Se il servizio non risponde si mostrano solo le coordinate.

### Architettura (`weather-server/src/stormTracking/`)

| File                      | Ruolo                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `geoGrid.js`              | Genera la griglia di coordinate attorno alla stazione (7×7 punti, raggio 50km) e le funzioni geografiche di base (distanza haversine, bearing, punto cardinale)          |
| `openMeteoClient.js`      | Un'unica chiamata HTTP a Open-Meteo (gratis, no API key) per ottenere precipitazione ogni 15 min (passata + adesso) e CAPE/raffiche/zero termico/codice meteo orari      |
| `cellDetector.js`         | Rileva le "celle" di precipitazione attiva in un frame: raggruppa per contiguità (flood-fill) i punti griglia sopra soglia e ne calcola il centroide pesato              |
| `cellTracker.js`          | Traccia la cella più vicina alla stazione nel tempo (frame per frame) per calcolare distanza, direzione, velocità di moto, tendenza ed ETA (proiezione lineare del moto) |
| `reverseGeocode.js`       | Risolve le coordinate della cella nel nome della località più vicina (OpenStreetMap Nominatim, gratuito)                                                                 |
| `hailEstimator.js`        | Stima euristica del rischio grandine e classificazione del CAPE                                                                                                          |
| `stormTrackingService.js` | Orchestratore: mette insieme tutti i moduli e produce la risposta finale                                                                                                 |

La route `GET /api/stormtracking` (`weather-server/src/routes/stormtracking.js`) espone il risultato con una cache di 2 minuti, e il frontend lo mostra nel componente `weather-frontend/src/StormTracker.js`, sotto la mappa radar Windy.

### Flusso in sintesi

1. **Griglia**: si generano 49 punti lat/lon attorno alla stazione (raggio 50 km).
2. **Dati**: un'unica chiamata a Open-Meteo restituisce, per tutti i 49 punti insieme, la pioggia ogni 15 minuti (ultimi 90 minuti + adesso).
3. **Rilevamento celle**: per ogni istante, i punti con pioggia sopra soglia vengono raggruppati in "celle" (aree di pioggia attiva contigue).
4. **Tracking**: si segue la cella più vicina alla stazione tra un frame e il successivo, per stimare la sua velocità e direzione di moto. Il centroide della cella attuale viene anche convertito nel nome della località più vicina (reverse geocoding).
5. **Proiezione**: si estrapola linearmente il movimento futuro per stimare se/quando la cella arriverà entro 15 km dalla stazione (ETA) o quanto si avvicinerà al massimo.
6. **Grandine/CAPE**: calcolati con un'euristica separata basata sui dati orari di Open-Meteo nel punto centrale (la stazione). Le **raffiche** invece sono prese direttamente dal forecast orario di Open-Meteo, senza calcoli aggiuntivi.
