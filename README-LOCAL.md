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
