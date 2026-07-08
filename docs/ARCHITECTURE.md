# housnkuh – Systemarchitektur

> Erstellt in Fahrplan-Phase 0 (siehe [FAHRPLAN.md](FAHRPLAN.md)). Dieses Dokument ist das
> Architektur-Gedächtnis des Projekts und wird von CLAUDE.md referenziert.
> Automatisch generierte Zahlen: [ARCHITECTURE_AUTO.md](ARCHITECTURE_AUTO.md).
> Letzte manuelle Aktualisierung: 2026-07-06.

## Überblick

housnkuh ist ein regionaler Selbstbedienungs-Marktplatz für Direktvermarkter:
Anbieter mieten Fächer (Mietfächer) im Laden, pflegen ihre Produkte online,
verkauft wird vor Ort über die flour.io-Kasse.

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + TypeScript 4.9.5, CRA mit **craco** (nicht Vite!), Tailwind CSS |
| Backend | Node.js + Express + TypeScript 5.3.3, Mongoose |
| Datenbank | MongoDB (lokal, `mongodb://localhost:27017/housnkuh`) |
| POS/ERP | flour.io (Cloud), REST-API v3 |
| Auth | JWT, zwei getrennte Kontexte (Admin / Vendor) |

## Ordnerstruktur

```
housnkuh_app/
├── client/src/
│   ├── pages/            # Routen-Seiten: public (Root), admin/ (22), vendor/ (17)
│   ├── components/
│   │   ├── admin/        # Admin-UI (AdminLayout, Modals, storemap-Editor)
│   │   ├── vendor/       # Vendor-UI (Bookings, Invoices, Trial-Modals)
│   │   ├── booking/      # Buchungs-Flow (PackageSelector, PriceSummary …)
│   │   ├── storemap/     # 3D-Ladenkarte (three.js, StoreMap3D, MietfachMesh)
│   │   ├── ui/           # Primitive (badge, StatusBadge, ProductBarcode …)
│   │   ├── layout/       # Hero, Navigation, Footer, PublicLayout
│   │   ├── common/       # Geteilte Bausteine (ErrorBoundary, DateRangePicker)
│   │   └── providers/    # SharedProviderWrapper (Auth-Kontexte)
│   ├── contexts/         # AuthContext (Admin), VendorAuthContext (Vendor)
│   ├── hooks/            # 12 Custom Hooks (usePackageBuilder, useTrialManagement …)
│   ├── services/         # priceCalculationService.ts
│   ├── utils/            # auth.ts (zentral!), imageUtils, sanitization …
│   └── types/            # booking.ts, common.ts, contract.types.ts
├── server/src/
│   ├── index.ts          # Entry Point: dotenv (.env.local → .env), Express-Setup, Jobs
│   ├── routes/           # Router pro Domäne, Aggregation in routes/index.ts unter /api
│   ├── controllers/      # Request-Handler
│   │   ├── admin/        # Domänenmodule; adminController.ts ist nur FACADE (re-exports)
│   │   └── vendor/       # Vendor-Controller
│   ├── services/         # Business-Logik; services/flourio/ = komplette ERP-Integration
│   ├── models/           # Mongoose-Schemas (siehe Datenmodell)
│   ├── jobs/             # Cron-Jobs (invoiceGeneration, stockPull, documentSync)
│   ├── middleware/       # auth, validation, rateLimiting, security, monitoring, caching
│   ├── migrations/       # DB-Migrationen + migrationRunner (npm run migrate:up)
│   ├── utils/            # emailService (~4000 Zeilen!), emailQueue, cache, logger, ean
│   ├── templates/        # Handlebars: invoice.hbs, invoice-email.hbs
│   └── types/modelTypes.ts  # Alle Model-Interfaces (IUser, IVertrag, IMietfach …)
├── docs/                 # Diese Doku, FAHRPLAN.md, flourio-api-v3/ (inkl. swagger.json)
├── .task/                # Task-Management (current/, completed/ ist gitignored, aborted/)
└── 3d mesh/              # (lokal, gitignored) 3D-Scan des Ladens für die Ladenkarte
```

## Datenfluss Frontend ↔ Backend

- Client spricht den Server über REST unter `/api/...` an; Basis-URL aus
  `REACT_APP_API_URL`, Fallback meist `http://localhost:4000/api`
  (⚠ einige Vendor-Seiten haben fälschlich `:5000` als Fallback, s. Inkonsistenzen).
  Dev-Proxy in `client/package.json`: `"proxy": "http://localhost:4000"`.
- Kein React Query / Redux: Server-State wird pro Komponente oder über die
  Auth-Kontexte geladen; Token liegen in `localStorage`
  (`adminToken`/`user` bzw. `vendorToken`/`vendorUser`) — bekannte XSS-Schwäche, Audit-Punkt.
- Duale Auth: `AuthContext` (Admin) und `VendorAuthContext` (Vendor) sind
  getrennte JWT-Flows, beide global via `SharedProviderWrapper` bereitgestellt.
  Geschützte Bereiche: `/admin/*` über `ProtectedRoute` + `AdminLayout`,
  `/vendor/*` über `VendorProtectedRoute` (ohne Layout-Wrapper).
- Alle Admin-/Vendor-Seiten sind lazy-geladen (`React.lazy` + `Suspense`);
  die öffentliche `/ladenkarte` lädt den three.js-Chunk ebenfalls lazy.

### Routen-Landkarte Server (Präfix `/api`)

| Präfix | Auth | Domäne |
|---|---|---|
| `/admin` | adminAuth | Dashboard, Users, Newsletter, Bookings, Verträge, Mietfächer, Invoices, Store-Map, Monitoring, Trials, Produkte |
| `/vendor-auth` | teils öffentlich, teils vendorAuth | Registrierung, Login, Profil, Buchungen, Produkte, Rechnungen |
| `/vendor/contracts`, `/vendor/trial` | vendorAuth | Vertrags-/Trial-Verwaltung des Vendors |
| `/public` | keine (gecacht 5–10 min) | Vendor-Listings, Store-Map, Statistiken |
| `/admin/flourio` | admin **oder** vendor | Tags, Produkte, Stock, Dokumente (flour.io-Sicht) |
| `/auth`, `/users`, `/mietfaecher`, `/vertraege`, `/invoices`, `/newsletter`, `/contact`, `/tags`, `/faqs`, `/vendor-contest` | gemischt | jeweilige Domäne |
| `/health`, `/metrics` | keine | Health-Checks, Prometheus-Metriken |

### Datenmodell (Kernbeziehungen)

```
User (isVendor) ──→ Vertrag ──→ Mietfach (mit optionaler position für Ladenkarte)
     │                 └──→ Invoice (RE-YYYY-MM-NNNNN, Counter-Model für Nummern)
     ├──→ Product[] ──→ Tag[] (Kategorien/Zertifizierungen, flourioId-Sync)
     └──→ PackageTracking
Settings = globaler Singleton (Store-Öffnung, Feature-Flags)
FlourioDocument = Cache der von flour.io gepullten Belege
```

**Wichtig:** Produkte haben **keine** mietfachId. Die Verknüpfung
Produkt ↔ Mietfach läuft ausschließlich über flour.io-StockItemEntries
(Warehouse-Architektur). Das ist eine bewusste Entscheidung.

## POS-Integration: flour.io

Komplett in `server/src/services/flourio/` (Client + Services + Mappings +
handgepflegte Typen in `generated/api-types.d.ts`; Quelle für künftige
Generierung: `docs/flourio-api-v3/swagger.json`).

- **Basis**: `https://flour.host/v3`, Auth per `Authorization: Bearer ${FLOURIO_BEARER_TOKEN}`.
- **Rate-Limit**: 60 req/min, `RateLimitHandler` mit Exponential Backoff (max. 32 s),
  Retries aus `FLOURIO_RETRY_ATTEMPTS` (Default 3).
- **Angesprochene Endpunkte**: `/articles`, `/articles/{id}`, `/businesspartners`,
  `/businesspartners/{id}`, `/warehouses`, `/stockitementries`, `/documents`, `/tags`.

| Richtung | Was | Auslöser |
|---|---|---|
| housnkuh → flour.io | Artikel (inkl. EAN-13-Scancode aus `utils/ean.ts`) | Produkt-CRUD (Vendor/Admin) |
| housnkuh → flour.io | BusinessPartner (Vendors) | Registrierung / Sync-Skript |
| housnkuh → flour.io | Tags/Kategorien | TagSyncService |
| flour.io → housnkuh | Bestände (StockItemEntries) | Job alle 5 min |
| flour.io → housnkuh | Belege/Dokumente | Job alle 15 min |

**API-Vertrags-Fallstricke** (aus leidvoller Erfahrung, siehe auch Memory/Doku):
flour.io liefert `_id` (nicht `id`), Bilder als Objekte, Fehler-Details in
`error.response`; Tag-Referenzen kommen als String-IDs (deshalb feuert der
flourioId-Writeback nie — bekanntes offenes Thema).

## Kiosk-Setup (Laden)

Die **Kassensoftware läuft vollständig in der flour.io-Cloud** — die Terminals
im Laden sind reine Anzeige-/Bedien-Clients ohne eigene POS-Logik und ohne
housnkuh-Code:

- **2× Kassen-Terminal**: Ubuntu im Kiosk-Modus, Browser startet per Autostart
  im Vollbild und zeigt die flour.io-Kassenoberfläche.
- **1× WiegePC**: vorhanden, aber noch nicht konfiguriert; soll Wiege-Station werden.
- **Netzwerk**: alle Terminals fest verkabelt (LAN, kein WLAN).
- **Deployment/Updates**: ⚠ noch nichts eingerichtet — kein Update-Mechanismus,
  kein Konfigurations-Management. **Offener Punkt** (Kandidat für FEATURES/TODO).

Konsequenz für Robustheit: Fällt das Internet aus, steht die Kasse
(Cloud-POS); housnkuh selbst ist davon unabhängig, muss aber flour.io-Ausfälle
tolerieren (Retry/Backoff vorhanden, s. o.).

## Jobs & Scheduling (`services/scheduledJobs.ts`)

| Job | Cron | Zweck |
|---|---|---|
| Trial Activation | `*/5 * * * *` | fällige Trials aktivieren |
| Trial Status Update | `0 6 * * *` | Trial-Abläufe prüfen |
| Health Checks | `*/5 * * * *` | DB/Memory/CPU |
| Performance Monitoring | `*/10 * * * *` | Request-Metriken |
| Alert Cleanup | `0 2 * * *` | alte Alerts löschen |
| Invoice Generation | `0 3 1 * *` | Monatsrechnungen an Vendors |
| Stock Pull (flour.io) | `*/5 * * * *` | Bestände ziehen |
| Document Sync (flour.io) | `*/15 * * * *` | Belege ziehen |

Beim Start außerdem: Tag-Seeding und Aktivierung geplanter Verträge.

## Preisberechnung: Client zeigt an, Server entscheidet (Stand 2026-07-08, Audit S15)

Die Preislogik existiert **dreifach** — zwei davon sind fast identische Kopien:

| Modul | Rolle | Nutzer |
|---|---|---|
| `client/src/services/priceCalculationService.ts` | Anzeige-Berechnung im Booking-Flow | `usePackageBuilder` (Live-Preis, plus eigener Fallback-Codepfad Z. 251–287), `VendorConfirmPage` (`calculateDetailedPrice`), `PriceBreakdownDisplay` (nur Typ) |
| `client/src/hooks/usePriceCalculation.ts` | **rechnet nicht** — liest nur `packageData.totalCost.monthly` und baut die Package-Summary (Name irreführend) | nur `VendorAuthContext` |
| `server/src/services/priceCalculationService.ts` | Server-Neuberechnung | `vendorAuthController.confirmVendorEmail`, `bookingAdminController.getPendingBookings`, `vertragController.calculatePriceWithZusatzleistungen` |

**Kernformeln sind synchron**: Package-Kosten (Preis × Anzahl), Zusatzleistungen
(Lagerservice 20 €, Versandservice 5 €, nur bei Provision 7 %), Rabattstaffel
(10 % ab 12, 5 % ab 6 Monaten), Provision (`monthlyTotal × rate/100`) — Client
und Server liefern für den Normalfall dieselben Zahlen.

**Aber: der verbindliche Vertragspreis entsteht woanders.**
`confirmPendingBooking` (`bookingAdminController.ts:145`) ruft
`createVertragFromPendingBooking` (`vertragController.ts:298`) auf, und der
nutzt den PriceCalculationService **nicht**: Monatspreise kommen aus dem
Mietfach-Typ-Mapping bzw. Admin-`priceAdjustments`, Zusatzleistungen sind hart
kodiert (20/5 €, `vertragController.ts:466–467`), und der Rabatt wird als
`packageData.discount` **ungeprüft vom Client übernommen**
(`usePackageBuilder.ts:334` → `vertragController.ts:426–427`). Der Server
rechnet also nur für Anzeigen neu; beim eigentlichen Vertragsabschluss
vertraut er dem clientseitig berechneten Rabattsatz.

**Gefundene Divergenzen (⚠ Warnliste, bewusst NICHT nebenbei gefixt):**

1. **Vierte, abweichende Rabattstaffel**: `calculateRabatt` in
   `server/src/types/zusatzleistungenTypes.ts:99–104` liefert **15/10/5 %** ab
   12/6/3 Monaten (als Prozentzahl, nicht Dezimal). Aktuell tot — in
   `vertragController.ts:15–16` importiert, aber nie aufgerufen. Wer sie
   benutzt, rechnet andere Preise als der Rest des Systems.
2. **Rabattbasis inkonsistent**: Beide PriceCalculationServices und
   `createVertragFromPendingBooking` rabattieren die Summe **inkl.**
   Zusatzleistungen (`vertragController.ts:427`); die Vertragsliste
   `getAllVertraege` rechnet den Rabatt dagegen **nur auf Mietfachpreise** und
   addiert Zusatzleistungen danach (`vertragController.ts:63–67`, der Kommentar
   dort erklärt das zur „korrekten" Rechnung). Beispiel 35 € Mietfach +
   20 € Lagerservice, 10 % Rabatt: Vertrag speichert 49,50 €
   ((35+20)×0,9); die Breakdown-Anzeige weist discountAmount 3,50 € aus,
   zeigt als Total aber das gespeicherte `totalMonthlyPrice` (49,50 €) —
   Breakdown in sich widersprüchlich (35 − 3,50 + 20 = 51,50 ≠ 49,50).
3. **Client-Validierung wirkungslos**: `validateZusatzleistungen` gibt im
   Client ein Objekt `{valid, errors}` zurück; in `calculatePrice`
   (`client .../priceCalculationService.ts:318`) steht `!this.validate…(…)` —
   ein Objekt ist immer truthy, der Fehlerpfad ist unerreichbar. Der Server
   (boolean, `server .../priceCalculationService.ts:108–110`) wirft bei
   Basic + Zusatzleistungen. Preislich gleich (beide rechnen 0 € bei 4 %),
   aber der Server lehnt Eingaben ab, die der Client anstandslos anzeigt.
4. **Discount-Fallback-Semantik (latent)**: Client
   (`client …:331`) `discount !== undefined ? discount : Staffel`, Server
   (`server …:204`) `discount || Staffel` — bei explizit übergebenem
   `discount: 0` und Laufzeit ≥ 6 Monate würde der Server den Laufzeitrabatt
   anwenden, der Client nicht. Praktisch (noch) nicht auslösbar, weil der
   Client bei Laufzeit ≥ 6 nie 0 sendet.

## Trial-Services: Zuständigkeiten (Stand 2026-07-08, Audit S18)

Drei Services teilen sich die Trial-Domäne; die Grundidee
**Core / Admin / Monitoring** ist erkennbar, aber nicht sauber durchgehalten:

| Service | Rolle | Aufrufer |
|---|---|---|
| `trialService.ts` (`TrialService`, statisch, ~920 Z.) | **Core-Lifecycle**: `calculateTrialPeriod` (auch Registrierung in `vendorAuthController`), Aktivierung (`activateTrialsOnStoreOpening`, `checkForTrialActivation`, `manuallyActivateVendorTrial`), Statusübergänge + Reminder-Mails (`updateTrialStatuses`), Einzeloperationen (`getTrialStatus/convertTrialToRegular/extendTrial/cancelTrial/getTrialHistory`), Statistiken (`getTrialStatistics`, `getTrialAnalytics`) | `scheduledJobs` (Cron), `vendorTrialController` (`/api/vendor/trial/*`), `adminTrialController` (Root-Datei, `/api/admin/trials` via `adminTrialRoutes`), `healthCheckService` |
| `trialManagementService.ts` (Singleton, ~540 Z.) | **Admin-Operationen mit Audit**: `extendTrial` (Audit + Reminder-Reset), `bulkUpdateTrialStatus`, `getAuditLog` (⚠ nur In-Memory, nach Neustart weg), `getExpiringTrials` | `admin/trialAdminController` (über adminController-Facade, Routen `/api/admin/trials/extend/:userId`, `/bulk-update`, `/audit-log`, `/expiring` in `adminRoutes`) |
| `trialMonitoringService.ts` (Singleton, ~460 Z.) | **Read-only Monitoring**: `getTrialMetrics` (5-Min-Cache), `getTrialHealthMetrics`, `getTrialDashboard`, `monitorTrialConversions` | `admin/monitoringAdminController` (`/admin/monitoring/trials*`), `scheduledJobs` |

**Überschneidungen / Konflikte:**

1. **Statistiken doppelt, mit unterschiedlichen Kriterien**:
   `TrialService.getTrialStatistics` (`trialService.ts:874`) zählt per
   `registrationStatus`; `trialMonitoringService.getTrialMetrics`
   (`trialMonitoringService.ts:111`) datumsbasiert per `trialEndDate` +
   `trialAutomation.trialConversionDate`. Die Zahlen können sich
   widersprechen: `convertTrialToRegular` (`trialService.ts:741`) setzt nur
   `registrationStatus='active'`, **nicht** `trialConversionDate` — solche
   Konversionen fehlen in den Monitoring-Metriken.
   `trialManagementService` (`getExpiringTrials`) nutzt ein drittes
   Kriterium (Existenz von `trialConversionDate`).
2. **`extendTrial` doppelt und divergent**: `TrialService.extendTrial`
   (`trialService.ts:769` — kein Audit, kein Reminder-Reset, Basis = altes
   Enddatum) vs. `trialManagementService.extendTrial`
   (`trialManagementService.ts:106` — Audit + Reminder-Reset, Basis =
   max(jetzt, Enddatum)). Beide sind als Admin-Endpoint erreichbar:
   `POST /api/admin/trials/:id/extend` (Root-Controller → TrialService) und
   `POST /api/admin/trials/extend/:userId` (trialAdminController →
   trialManagementService). Gleiches Muster bei Bulk (`/trials/bulk` vs.
   `/trials/bulk-update`).
3. **Zwei Admin-Controller im selben URL-Raum**:
   `controllers/adminTrialController.ts` (gemountet als `/admin/trials` via
   `adminTrialRoutes`) und `controllers/admin/trialAdminController.ts`
   (Pfade `/trials/*` in `adminRoutes`, gemountet als `/admin`). `adminRoutes`
   ist zuerst gemountet und gewinnt bei Pfad-Kollisionen. Innerhalb von
   `adminTrialRoutes` verschattet zudem `GET /:id` (Z. 27) die später
   registrierten `GET /stats` und `GET /export` (Z. 36/39 — unerreichbar).
   Das Frontend nutzt aktuell nur `POST /admin/trials/activate`
   (LaunchDayMonitor); alle übrigen Trial-Endpoints beider Controller sind
   ohne Client-Aufrufer.

**Ungenutzte Exports/Methoden (nur dokumentiert, nicht gelöscht):**
`TrialService.sendTrialConversionConfirmation` (`trialService.ts:541`),
`trialManagementService.searchVendorsByTrialStatus`
(`trialManagementService.ts:505`), `trialMonitoringService.clearCache`
(`trialMonitoringService.ts:458`) sowie die ungenutzten Importe
`calculateRabatt`/`calculateMonthlyTotal` in `vertragController.ts:15–16`.

## Umgebungsvariablen

Ladereihenfolge in `server/src/index.ts`: `.env.local` → `.env` → Default-Suche.
Referenz mit Platzhaltern: `server/.env.example`. Gruppen:

- **Server**: `PORT` (4000), `NODE_ENV`, `PUBLIC_SERVER_URL` (Prod nötig, damit
  flour.io absolute Bild-URLs bekommt!), `FRONTEND_URL`, `CORS_ORIGINS`
- **DB**: `MONGO_URI`
- **Auth**: `JWT_SECRET`, `ADMIN_SETUP_KEY`
- **E-Mail**: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`,
  `EMAIL_SECURE`, `EMAIL_FROM`, `ADMIN_EMAIL` (⚠ teils nicht in .env.example)
- **flour.io**: `FLOURIO_BEARER_TOKEN`, `FLOURIO_API_URL`, optional `FLOURIO_TIMEOUT`,
  `FLOURIO_RETRY_ATTEMPTS`, `FLOURIO_MOCK_MODE`, Tenant-IDs
  (`FLOURIO_DEFAULT_PRICELIST_ID`, `FLOURIO_DEFAULT_REVENUE_CREDITOR_ID`,
  `FLOURIO_TAXASSIGNMENT_FULL/REDUCED`), `FLOURIO_WAREHOUSE_*`
- **Rechnungen**: `COMPANY_NAME/ADDRESS/EMAIL/PHONE/WEBSITE/TAX_ID`, `COMPANY_LOGO_PATH`
- **Dev**: `SEED_MIETFAECHER`
- **Client**: einzig `REACT_APP_API_URL` (Fallbacks uneinheitlich, s. u.)

## Externe Abhängigkeiten

- **flour.io** (Cloud-POS/ERP) — einzige harte externe Laufzeit-Abhängigkeit.
- **SMTP** (Nodemailer; Dev: Mailpit auf localhost:1025).
- Client-Bibliotheken: react-router 6, axios, leaflet/react-leaflet (Karte),
  recharts, formik+yup, framer-motion, lucide-react, jsbarcode (EAN-Labels),
  **three@0.160.1 / @react-three/fiber@8.18.0 / @react-three/drei@9.122.0 —
  für TypeScript 4.9.5 gepinnt, NICHT bumpen.**

## Konventionen

- **Conventional Commits**, erzwungen durch commit-msg-Hook
  (pre-commit/pre-push-Hooks wurden am 2026-07-06 bewusst entfernt).
- **Co-located Tests**: `X.test.tsx` neben `X.tsx`; `__tests__/` nur für
  Integrations-/Performance-Tests.
- **Datei-Header** `@file`/`@purpose` für neue Dateien empfohlen.
- **Facade-Pattern**: `adminController.ts` re-exportiert aus `controllers/admin/*`.
- Domänensprache Deutsch (Vertrag, Mietfach, Zusatzleistung), Technik Englisch.

## Bekannte Inkonsistenzen (Stand 2026-07-06, Audit-Futter für Phase 1)

**Server**
1. Fehlerbehandlung gemischt: ~105 try/catch in Controllern, ~100 nackte `throw`,
   keine gemeinsame Error-Klasse; Error-Middleware existiert, wird aber umgangen.
2. `require()` statt `import` an ~13 Stellen (adminRoutes, vertragController …).
3. Response-Formate uneinheitlich (`{success, data}` vs. Ad-hoc-Objekte).
4. ~369× `any` (Hotspots: flourioRoutes, mietfachController, vertragController).
5. `emailService.ts` ~4000 Zeilen (nächstgrößte Datei ~1200) — Aufteilen wäre sinnvoll.
6. Drei Cache-Systeme (utils/cache, utils/queryCache, cacheMiddleware) ohne
   gemeinsame Invalidierung.
7. Zwei Migrations-Orte: `server/src/migrations/` (Runner) und
   `server/scripts/migrations/` (Einzelskripte) — `scripts/` ist inzwischen
   bis auf `migrations/` gitignored; `migrate:backup`/`migrate:validate` in
   package.json zeigen auf nicht mehr versionierte Skripte.
8. Keine eigene OpenAPI-Spec für die housnkuh-API (nur JSDoc).

**Client**
9. API-Basis-URL-Fallbacks uneinheitlich: meist `:4000/api`, aber
   VendorLogin/ForgotPassword/ResetPassword/SettingsPage `:5000/api` (falsch),
   FlourioDocumentsPage `/api`, imageUtils ohne `/api`.
10. Keine zentrale API-Schicht: 22 direkte axios/fetch-Aufrufe in Komponenten.
11. Styling gemischt: ~95 % Tailwind, 8 Legacy-CSS-Dateien (InvoiceDetail,
    Trial-Modals, DateRangePicker …).
12. Zwei .js-Dateien in TS-Codebase: `utils/clearAuth.js` (Legacy),
    `utils/invoiceApi.js` (Debug-Werkzeug, auto-läuft auf dem Invoice-Dashboard).
13. Preislogik doppelt: `services/priceCalculationService.ts` und Hook
    `usePriceCalculation` — analysiert, siehe Abschnitt
    „Preisberechnung: Client zeigt an, Server entscheidet".
14. Test-Abdeckung dünn und driftend: viele untracked Test-Dateien erwarten
    alte UI/Endpunkte (eigener Cleanup-Pass geplant).

**Repo-übergreifend**
15. Drei TypeScript-Versionen: Client 4.9.5 (gepinnt wegen CRA/three),
    Server 5.3.3, Root 5.8.3.
16. Ältere Uploads/DB-Backups/Debug-Skripte sind noch git-getrackt
    (neue sind seit 2026-07-06 gitignored); Enttracken ist eine offene Entscheidung.

## Deployment-Realität

- **Aktuell**: Entwicklung und Betrieb lokal (Arch Linux); Server läuft als
  kompiliertes `node dist/index.js` → nach Code-Änderungen `npm run build` +
  manueller Neustart (kein nodemon im Betrieb). MongoDB nativ auf localhost.
- **Kein** Vercel/Netlify/Atlas im Einsatz (frühere Doku-Behauptung war falsch).
- Produktiv-Deployment (Hosting, HTTPS, Prozess-Manager, Backups) ist ein
  **offener Punkt** — gehört in FEATURES/TODO.
