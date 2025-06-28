# Modifiche necessarie al frontend per il deployment

1. Modifica il riferimento all'API backend da localhost a un URL dinamico
2. Crea un file .env per gestire le variabili d'ambiente

## File .env.development (per sviluppo locale)
REACT_APP_API_URL=http://localhost:4000

## File .env.production (per ambiente di produzione)
REACT_APP_API_URL=https://tuo-backend-url.com

## Aggiorna App.js per usare l'URL dinamico
Sostituisci tutte le chiamate dirette a "http://localhost:4000" con:
`${process.env.REACT_APP_API_URL}/api/...`
