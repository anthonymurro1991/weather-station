# Guida al deployment dell'applicazione Meteo Murro

Questa guida ti aiuterà a mettere online la tua applicazione meteo, sia il frontend React che il backend Node.js.

## Opzione 1: Deployment gratuito con Vercel/Netlify e Render

### Frontend (React) con Vercel

1. Crea un account su [Vercel](https://vercel.com/)
2. Installa Git e crea un repository su GitHub per il tuo progetto
3. Collega Vercel al tuo account GitHub
4. Importa il repository in Vercel
5. Durante la configurazione, assicurati di:
   - Impostare la cartella principale come `weather-frontend`
   - Impostare il comando di build come `npm run build`
   - Impostare la directory di output come `build`
   - Aggiungere la variabile d'ambiente `REACT_APP_API_URL` con l'URL del tuo backend

### Backend (Node.js) con Render

1. Crea un account su [Render](https://render.com/)
2. Vai su "New" e seleziona "Web Service"
3. Collega il tuo repository GitHub o carica i file direttamente
4. Configura il servizio:
   - Nome: `meteo-murro-api`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Aggiungi le variabili d'ambiente:
     - `WEATHER_API_KEY`: La tua API key Weather Underground
     - `STATION_ID`: IBARIA12
     - `NODE_ENV`: production

## Opzione 2: Hosting con VPS (DigitalOcean, Linode, etc.)

### Configurazione del server

1. Crea un droplet su DigitalOcean (il piano base da $5/mese è sufficiente)
2. Connettiti via SSH e installa Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Installa Nginx come reverse proxy:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

4. Carica i tuoi file sul server o clona il repository:
   ```bash
   git clone https://github.com/tuo-username/meteo-murro.git
   ```

5. Installa PM2 per gestire il processo Node.js:
   ```bash
   sudo npm install -g pm2
   ```

6. Avvia il backend con PM2:
   ```bash
   cd weather-server
   npm install
   pm2 start index.js --name meteo-api
   ```

7. Configura Nginx per servire il frontend e fare da proxy per il backend:
   ```nginx
   server {
     listen 80;
     server_name tuodominio.com;

     location / {
       root /path/to/weather-frontend/build;
       index index.html;
       try_files $uri $uri/ /index.html;
     }

     location /api {
       proxy_pass http://localhost:4000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

8. Riavvia Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

9. Configura un dominio puntandolo all'IP del tuo server

## Opzione 3: Hosting Docker con Docker Compose

1. Crea un file `Dockerfile` per il backend:
   ```Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 4000
   CMD ["node", "index.js"]
   ```

2. Crea un file `Dockerfile` per il frontend:
   ```Dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/build /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

3. Crea un file `docker-compose.yml`:
   ```yaml
   version: '3'
   services:
     api:
       build: ./weather-server
       ports:
         - "4000:4000"
       environment:
         - NODE_ENV=production
         - WEATHER_API_KEY=your_api_key
         - STATION_ID=IBARIA12
     web:
       build: ./weather-frontend
       ports:
         - "80:80"
       depends_on:
         - api
   ```

4. Avvia con Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Opzione 4: Esposizione rapida con Ngrok

Ngrok è uno strumento che permette di esporre rapidamente un server locale a internet, ideale per test, demo o condivisioni temporanee dell'applicazione.

### Passo 1: Installare Ngrok

1. Scarica Ngrok da [https://ngrok.com/download](https://ngrok.com/download)
2. Estrai il file scaricato
3. (Opzionale) Crea un account gratuito su Ngrok per ottenere un token di autenticazione

### Passo 2: Avviare il backend e il frontend localmente

1. Avvia prima il backend:
   ```bash
   cd weather-server
   npm install
   node index.js
   ```
   Dovrebbe essere in esecuzione su http://localhost:4000

2. In un nuovo terminale, avvia il frontend:
   ```bash
   cd weather-frontend
   npm install
   npm start
   ```
   Dovrebbe essere in esecuzione su http://localhost:3000

### Passo 3: Esporre il backend con Ngrok

1. Apri un nuovo terminale
2. Naviga alla cartella dove hai estratto Ngrok
3. Esegui il comando:
   ```bash
   # Se hai un account Ngrok, prima autentica (solo la prima volta)
   ngrok authtoken IL_TUO_TOKEN

   # Avvia il tunnel per il backend
   ngrok http 4000
   ```
4. Ngrok mostrerà un URL pubblico (es. https://abc123.ngrok.io)
5. Copia questo URL, lo userai nel prossimo passo

### Passo 4: Configurare il frontend per usare il backend esposto

Per un test rapido, puoi semplicemente modificare il file `.env.development`:

1. Apri il file `weather-frontend/.env.development`
2. Modifica la variabile REACT_APP_API_URL:
   ```
   REACT_APP_API_URL=https://abc123.ngrok.io
   ```
   (sostituisci con l'URL fornito da Ngrok)
3. Riavvia il frontend (interrompi il processo con Ctrl+C e riavvia con `npm start`)

### Passo 5: Condividi l'URL del frontend

Ora puoi condividere http://localhost:3000 con chiunque sulla tua rete locale, o se vuoi condividerlo anche esternamente, puoi aprire un altro tunnel Ngrok per il frontend:

```bash
# In un nuovo terminale
ngrok http 3000
```

Questo ti darà un URL pubblico per accedere al frontend, che userà il backend già esposto attraverso Ngrok.

### Note importanti su Ngrok

- Gli URL gratuiti di Ngrok sono temporanei e cambiano ad ogni riavvio
- Con un account gratuito, la sessione scade dopo alcune ore
- Per progetti persistenti, considera una delle altre opzioni di deployment
- Con un account a pagamento, puoi avere URL fissi e altre funzionalità

## Risorse utili

- [Guide al deployment di React](https://create-react-app.dev/docs/deployment/)
- [Guide al deployment di Node.js](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Configurazione HTTPS con Let's Encrypt](https://letsencrypt.org/getting-started/)
- [Monitoraggio applicazioni con PM2](https://pm2.keymetrics.io/docs/usage/monitoring/)
