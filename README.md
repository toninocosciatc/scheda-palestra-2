# Scheda Palestra PWA — Versione 2

Versione aggiornata della PWA personale.

## Novità
- Esercizi in menu a tendina/fisarmonica per avere subito la panoramica del giorno.
- Per ogni esercizio vedi l'ultima volta salvata: carico top, ripetizioni, fatica e data.
- Confronto rapido con la volta precedente tramite progressione peso top.
- Volume totale del giorno e confronto con l'ultimo allenamento dello stesso giorno.
- Rating fatica colorato da 1 a 5.
- Storico allenamenti migliorato.

## Compatibilità dati
La chiave di salvataggio è rimasta `scheda-palestra-v1`, quindi i dati già salvati dalla prima versione non vengono cancellati.

## Come aggiornare su GitHub
1. Apri il tuo repository GitHub.
2. Clicca `Add file` > `Upload files`.
3. Carica questi file sovrascrivendo quelli esistenti:
   - index.html
   - style.css
   - app.js
   - manifest.json
   - service-worker.js
   - icon-192.png
   - icon-512.png
   - README.md
4. Clicca `Commit changes`.
5. Riapri l'app dal telefono. Se non vedi subito le modifiche, chiudi e riapri l'app o ricarica la pagina dal browser.

## Nota
I dati vengono salvati nel browser del telefono tramite localStorage.
