# CLAUDE.md

## Project Overview

housnkuh – Regionaler Marktplatz für Direktvermarkter
(React 18/TS + Node/Express/MongoDB, POS über flour.io-Cloud).

## Key References

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** – Systemarchitektur, flour.io, Kiosk, Inkonsistenzen
- **[docs/FAHRPLAN.md](docs/FAHRPLAN.md)** – Fahrplan zur Fertigstellung (Phasen 0–4)
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** – Setup, Workflow, Testing
- **[.task/current/](.task/current/)** – Aktive Tasks

## Architektur-Kurzfassung

- **Client**: React 18 + TypeScript 4.9.5, CRA mit **craco** (nicht Vite), Tailwind
- **Server**: Express + TypeScript 5.3.3 + Mongoose; API unter `/api/...` (kein `/v1`)
- **Dual Auth**: AuthContext (Admin, `adminToken`) + VendorAuthContext (Vendor, `vendorToken`) – strikt getrennt lassen
- **Facade-Pattern**: `adminController.ts` re-exportiert aus `controllers/admin/*`-Domänenmodulen
- **flour.io**: komplette Integration in `server/src/services/flourio/` (Bearer-Token, 60 req/min, Retry/Backoff)

## Entwicklungsregeln

1. **Root Cause fixen** – keine Workarounds, keine Mock-Daten
2. **Co-located Tests**: `.test.tsx` neben Komponenten, `.test.ts` neben Modulen; `__tests__/` nur für Integration/Performance
3. **Conventional Commits**: `feat|fix|docs|style|refactor|test|chore(scope): message` (commit-msg-Hook erzwingt das)
4. **Datei-Header** `@file`/`@purpose` für neue Dateien empfohlen
5. **Namenskonvention (AUDIT KON6)**: Domänenbegriffe deutsch (Vertrag,
   Mietfach, Zusatzleistung, Provision), Technisches englisch. Gewachsene
   Mischformen (`zusatzleistungenCosts`, `monatlicheKosten`) NICHT umbenennen —
   nur neuer Code folgt der Regel.

## Befehle

```bash
# Entwicklung (Root)
npm run dev                 # Client (:3000) + Server (:4000, nodemon)

# Client
cd client && npm test && npm run build && npx tsc --noEmit && npm run lint

# Server
cd server && npm test && npm run build && npx tsc --noEmit && npm run lint

# Migrationen
cd server && npm run migrate:up

# Architektur-Statistiken aktualisieren
npm run update:architecture
```

Betrieb: Server läuft als kompiliertes `node dist/index.js` → nach Fixes
`npm run build` + manueller Neustart.

## No-Gos (absichtlich so – NICHT "aufräumen")

- **three/@react-three-Versionen sind gepinnt** (three@0.160.1, fiber@8.18.0,
  drei@9.122.0) für TypeScript 4.9.5 – nicht bumpen, Client-TS nicht anheben.
- **Produkte haben KEINE mietfachId** – Verknüpfung Produkt↔Mietfach läuft
  bewusst über flour.io-StockItemEntries.
- **Dual-Auth nicht zusammenlegen** – zwei getrennte JWT-Flows sind gewollt.
- **Domänenbegriffe bleiben deutsch** (Vertrag, Mietfach, Zusatzleistung,
  Direktvermarkter) – nicht ins Englische umbenennen.
- **Keine `.env`-Dateien, CSV-Exporte, Uploads oder DB-Backups committen**
  (personenbezogene Daten; .gitignore deckt das ab).
- **flour.io-API-Eigenheiten nicht "korrigieren"**: `_id` statt `id`,
  Bilder als Objekte, Fehlerdetails in `error.response` – das ist deren Vertrag.
- **Keine tsconfig-Pfad-Aliase** (`@utils/…`) einführen (AUDIT KON7, bewusst):
  `tsc` schreibt Aliase nicht um — der dist-Betrieb bräuchte eine
  Laufzeit-Auflösung (tsconfig-paths), CRA unterstützt paths nicht.
  Relative Imports sind der Preis für den einfachen `node dist/index.js`-Betrieb.
- Bekannte Inkonsistenzen (siehe ARCHITECTURE.md) nur im Rahmen des
  Audit-Plans beheben, nicht nebenbei.

## Git-Hooks

Nur noch **commit-msg** (Conventional Commits). pre-commit/pre-push wurden am
2026-07-06 bewusst entfernt – Qualitätssicherung läuft manuell über die
Befehle oben. **Vor einem Push**: Tests und Builds selbst laufen lassen.

## Task-Management

Tasks in `.task/current/` im Format `TASK-XXX-beschreibung.md`:
1. User Acceptance Criteria und Testplan im Task prüfen
2. Implementieren, alle Kriterien verifizieren
3. Volle Testsuite vor Abschluss
4. Nach Bestätigung nach `.task/completed/` verschieben

Ad-hoc-Arbeit ohne Task-Datei ist okay, wenn explizit gewünscht.
