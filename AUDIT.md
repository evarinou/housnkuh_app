# housnkuh – Audit (Fahrplan Phase 1)

> Bestandsaufnahme ohne Fixes. Abarbeitung erst in Phase 3 (Reihenfolge:
> Sicherheit/Daten → Konsistenz → Kosmetik). Erledigtes wird hier abgehakt.
> Prioritäten: **K** = kritisch · **W** = wichtig · **k** = kosmetisch.
> Stand Durchlauf 1a: 2026-07-06. Befunde maschinell gesucht und stichprobenartig
> per Import-Grep verifiziert (verwaiste Dateien alle bestätigt).

## Struktur (Durchlauf 1a: toter Code, Verwaiste, Duplikate)

### Getrackte Altlasten im Repo

- [x] **S1 (K)** ✅ (T5.4: enttrackt, gitignore deckt ab) `server/scripts/debug/` — 25 getrackte Debug-Einmalskripte
  (debug-auth.js, debug-revenue.js, check-pending-bookings.js …). Gehören nicht
  ins Repo; ob sie Secrets/echte IDs enthalten prüft Durchlauf 1b.
  → `git rm --cached` + .gitignore-Abdeckung.
- [x] **S2 (K)** ✅ (T5.4: enttrackt; History-Rewrite separat offen) `server/uploads/vendor-images/` — echte Nutzerbilder getrackt
  (Datenschutz!). Neue sind seit 2026-07-06 ignoriert, alte noch im Repo
  (und in der Historie). → enttracken; History-Rewrite separat entscheiden.
- [x] **S3 (W)** ✅ (T5.4: enttrackt) `server/backups/*.json` — 3 DB-Dumps/Reports von 2025-06-25
  getrackt (Mietfächer-Backups). → enttracken.
- [x] **S4 (W)** ✅ (T5.4: gelöscht, Evas Freigabe) `server/scripts/DANGEROUS-*.disabled` — 3 deaktivierte
  Destruktiv-Skripte (clear-all-data, seed-db, create-sample-data) getrackt.
  → löschen oder bewusst behalten (Eva entscheidet).
- [x] **S5 (W)** ✅ (T5.5: alle Suiten repariert/committet, beide Suiten grün) ~90 untracked Test-Dateien mit bekannter Drift (~30 Client-,
  ~60 Server-Failures, erwarten alte UI/Endpunkte) + unkommittete Änderungen an
  `emailService.test.ts`/`adminController.test.ts`. → eigener Cleanup-Pass:
  reparieren was das aktuelle Verhalten testet, löschen was Altes testet,
  Rest committen (auch die grünen Ladenkarte-Tests).

### Verwaiste Dateien (Import-Grep bestätigt: keine Referenzen)

- [x] **S6 (W)** ✅ (T5.4: gelöscht) `client/src/components/Features.tsx` (120 Z.) — fertige, nie
  eingebundene Komponente. → löschen oder bewusst einbauen.
- [x] **S7 (W)** ✅ (T5.4: gelöscht, Evas Entscheidung) `client/src/components/ConstructionBanner.tsx` (185 Z.) —
  Eröffnungs-Countdown-Banner, nirgends importiert. Reaktivierungs-Kandidat
  oder löschen (Eva entscheidet — Feature-Frage für Phase 2).
- [x] **S8 (W)** ✅ (T5.2: PriceFormatter ist jetzt Standard) `client/src/utils/priceFormatting.ts` — zentrale
  `PriceFormatter`-Klasse mit 8 Methoden, wird von NIEMANDEM genutzt,
  während 14+ Komponenten eigene formatPrice/formatCurrency-Inlines haben
  (siehe S13). → Utility zum Standard machen, Inlines migrieren.
- [x] **S9 (W)** ✅ (T5.4: gelöscht) `server/src/services/priceValidationService.ts` (170 Z.) —
  exportiert, nie importiert. → löschen oder in Produkt-Validierung einbinden.
- [x] **S10 (W)** ✅ (T5.4: gelöscht) `server/src/config/database.ts` (226 Z.) — zweite
  DB-Config mit QueryPerformance/HealthCheck, nie importiert (aktiv ist
  `config/db.ts`). → löschen oder Monitoring-Teile übernehmen.
- [x] **S11 (W)** ✅ (T5.4: gelöscht — war obsolet) `server/src/middleware/trialMiddleware.ts` — definiert, aber
  in keiner Route eingehängt. → klären: vergessen oder obsolet?
- [x] **S12 (k)** ✅ (T5.4: gelöscht) Verwaiste Kleinteile: `server/src/utils/emailTestHelper.ts`
  (6,4 KB, Mailpit-Helfer), `server/src/utils/assignDemoTags.ts` (61 Z.,
  hartkodierte Test-Mail), `client/src/utils/clearAuth.js` (19 Z.,
  Legacy-Wrapper), `client/src/components/vendor/PaymentOptionsModal.css`
  (7,8 KB CSS ohne Komponente — .tsx existiert nicht), 4 ungenutzte Bilder in
  `client/src/assets/images/` (hero_bild.png, Hero_Medium/Small.png,
  primary_orange.svg). → löschen.

### Doppelte Logik

- [x] **S13 (W)** ✅ (T5.2: 12 Dateien auf PriceFormatter migriert) Preisformatierung 14+-fach inline dupliziert
  (ArticleManagementPage, InvoiceDashboard, PriceBreakdownDisplay,
  BookingDetailModal, ProductCard, InvoiceDetail/List, VendorContractsPage,
  FlourioDocumentsPage, ProductLabelPrintModal …) statt `priceFormatting.ts`
  (siehe S8). → auf zentrale Utility migrieren.
- [x] **S14 (W)** ✅ (2026-07-08: 66 Stellen in 32 Dateien auf apiUtils.getApiUrl migriert) API-Basis-URL-Ermittlung in 41 Client-Dateien inline
  (`process.env.REACT_APP_API_URL || …`) statt `apiUtils.getApiUrl()` aus
  `utils/auth.ts`. Folgeproblem: divergierende Fallbacks (`:4000` vs `:5000`
  vs `/api`) — Detail in Durchlauf 1c. → zentrale Helper-Nutzung.
- [ ] **S15 (W)** Preisberechnung doppelt: `client/src/services/priceCalculationService.ts`
  (18 KB) und Hook `usePriceCalculation` + Server-Pendant
  `server/src/services/priceCalculationService.ts`. → Abgrenzung
  dokumentieren oder konsolidieren (client rechnet Anzeige, Server verbindlich?).
- [ ] **S16 (W)** Drei Cache-Systeme im Server (`utils/cache.ts`,
  `utils/queryCache.ts`, `middleware/cacheMiddleware.ts`) ohne gemeinsame
  Invalidierung; in adminRoutes ist der cacheMiddleware-Import auskommentiert
  und stattdessen `noCacheHeaders` inline definiert und ~20× angewendet.
  → Strategie vereinheitlichen, noCacheHeaders auslagern.
- [ ] **S17 (W)** `server/src/utils/emailService.ts` (~4000 Z. / 173 KB)
  Monolith neben `emailQueue.ts` (645 Z.) und `emailHelpers.ts`; in
  bookingAdminController wird die Queue laut Kommentar bewusst umgangen
  („emailQueue bypassed in favor of direct sending"). → modularisieren,
  Versandweg vereinheitlichen (Größenordnung: eigener Task).
- [ ] **S18 (k)** Drei Trial-Services (trialService 920 Z.,
  trialManagementService 538 Z., trialMonitoringService ~400 Z.) — Trennung
  Core/Admin/Monitoring ist plausibel, Überschneidungen bei Status-Abfragen
  im Zuge anderer Arbeiten prüfen.

### Auskommentiertes & Debug-Reste

- [x] **S19 (W)** ✅ (bereits in T0.4 gelöscht) `client/src/utils/invoiceApi.js` — Debug-Werkzeug, das sich
  auf `/admin/invoice-dashboard` automatisch ausführt (fetch-Tests +
  console.logs in Produktion). → entfernen oder hinter Debug-Flag.
- [ ] **S20 (W)** console.log/error in 62 Client-Dateien (Hotspot:
  MietfachAssignmentModal „CRITICAL DEBUG"). → Lint-Regel `no-console`
  (warn) + Aufräum-Pass.
- [x] **S21 (k)** ✅ (2026-07-08: entfernt) Auskommentierte Routen/Importe in `adminRoutes.ts`
  (M005-Routen, cacheMiddleware) und `flourioRoutes.ts`
  (`/tags/sync`, sauber als @deprecated markiert). → entfernen.
- [x] **S22 (k)** ✅ (T4.3: WebSocket ist gebaut, TODOs weg) TODO-Marker für nie gebaute WebSocket-Anbindung in
  `useBookingUpdates.ts` / `useDashboardMessages.ts` (Polling ist Stand). →
  TODOs entfernen oder als Feature in Phase 2 entscheiden.

### Hinweise für spätere Durchläufe

- Badge-Komponenten (StatusBadge, SyncStatusBadge, BookingStatusBadge,
  StockLevelBadge, TagBadge) wurden geprüft: unterschiedliche Domänen,
  **keine** Duplikate — keine Aktion.
- Unauthentifizierte `/debug/clear-cache`-Route → Durchlauf 1b (Sicherheit).
- `:5000`-API-Fallbacks, require()-Stellen, any-Wildwuchs → Durchlauf 1c.

## Sicherheit (Durchlauf 1b)

Befunde per Datei:Zeile belegt und stichprobenartig selbst nachgeprüft.
Einige Agent-Einstufungen wurden nach Prüfung angepasst (Begründung dabei).

### Kritisch

- [x] **SEC1 (K→hinfällig)** `server/scripts/test-with-real-token.js:9` — Agent
  meldete einen „git-getrackten" Admin-JWT. **Gegenprüfung 2026-07-06 (T0.2):
  FEHLALARM.** Die Datei wurde nie committet (`git log` leer), ist untracked
  WIP und fällt jetzt unter die `server/scripts/*`-Ignore-Regel. Der volle echte
  flour.io-Token liegt in KEINER getrackten Datei; die Tokens in
  `docs/flourio-api-v3/*` sind abgeschnittene Beispiele. Kein Handeln nötig,
  keine erzwungene JWT_SECRET-Rotation. (Lehre: Agent-„tracked"-Claims gegen
  `git log` prüfen.)
- [x] **SEC2 (K)** ✅ erledigt (T0.1): unauthentifizierte
  `POST /admin/debug/clear-cache` entfernt.

### Wichtig

- [ ] **SEC3 (W)** `server/src/services/vendorService.ts:184` — `new RegExp(location, 'i')`
  aus `req.query.location` (via `publicRoutes.ts:35`, öffentlich, unvalidiert)
  → RegExp-Injection / ReDoS auf öffentlichem Vendor-Listing. → Eingabe escapen
  oder auf Literal-Match umstellen; Länge begrenzen.
- [ ] **SEC4 (W)** `client/src/pages/admin/InvoiceDashboard.tsx:422,490` —
  `console.log` gibt komplette Auth-Header (Bearer-Token) bzw. Token-Präfix in
  der Browser-Konsole aus. → entfernen (gehört zum Debug-Tool S19/invoiceApi.js).
- [ ] **SEC5 (W)** Vendor-Login validiert die Passwort-Policy
  (`server/src/routes/vendorAuthRoutes.ts:36`, nur `authRateLimit`) — bekanntes
  UX-Problem: Nutzer mit policy-verletzendem Alt-Passwort kommen nicht rein.
  Siehe [[project_vendor_auth_issues]]. → Login prüft nur Präsenz, nicht Policy.
- [ ] **SEC6 (W)** `server/src/controllers/newsletterController.ts:185-206` —
  im `NODE_ENV === 'development'` wird die Token-Prüfung der
  Newsletter-Bestätigung übersprungen (bestätigt ohne gültigen Token).
  Greift nur bei falsch gesetztem NODE_ENV (deshalb W statt K, aber
  Defense-in-Depth). → Dev-Zweig entschärfen/entfernen.
- [ ] **SEC7 (W)** `server/src/routes/authRoutes.ts:33-36` — `POST /setup` hat
  `validateAdminSetup` auskommentiert („Temporarily removed") → keine
  Feld-Validierung bei Admin-Anlage. Ausnutzbarkeit begrenzt durch den
  adminExists-Check (kein zweiter Admin möglich), daher W. Zusätzlich
  `router.all('/test-setup', …)` (Z. 27) loggt `req.body` inkl. Credentials.
  → Validierung reaktivieren, Test-Route entfernen.
- [ ] **SEC8 (W)** JWT im `localStorage` (`adminToken`/`vendorToken`) →
  XSS-exfiltrierbar. Architektur-Thema (httpOnly-Cookie wäre robuster),
  eigener größerer Task. → als bekannte Schwäche dokumentiert.
- [ ] **SEC9 (W)** `server/src/config/config.ts:38` — Dev-Fallback
  `'development-jwt-secret-not-for-production'`. In Prod korrekt abgefangen
  (wirft ohne `JWT_SECRET`), Risiko nur bei falschem NODE_ENV in Staging.
  → sicherstellen, dass alle Nicht-Local-Umgebungen `NODE_ENV=production` + echtes Secret haben.
- [ ] **SEC10 (W)** `server/src/controllers/vendor/vendorProfileController.ts`
  (u. a. Z. 167, 206-209, 316) — Profil-Textfelder werden ohne Längen-/
  Formatprüfung übernommen; XSS-Schutz hängt allein an der globalen
  Regex-Sanitization (`middleware/security.ts`), die nicht alle Vektoren
  abdeckt. → express-validator-Kette für Profil-Update (analog Produkt-Rules).
- [ ] **SEC11 (W)** `server/src/middleware/security.ts:24` — CSP mit
  `scriptSrc: ['self','unsafe-inline']` (nur Prod aktiv) schwächt den
  XSS-Schutz. → `unsafe-inline` entfernen, sofern machbar.

### Kosmetisch / Defense-in-Depth

- [ ] **SEC12 (k)** `server/src/controllers/newsletterController.ts:241` —
  `POST /newsletter/unsubscribe` (hat Rate-Limit + Validierung, aber keinen
  Token): jeder kann per bekannter E-Mail fremde Abos beenden. Geringer Schaden;
  Token-basierter Unsubscribe-Link wäre sauberer. (Agent-Behauptung „keine
  Validierung" war falsch — Route hat `validateNewsletterSubscription`.)
- [ ] **SEC13 (k)** Kein `express-mongo-sanitize`; Schutz nur über eigene
  Regex-Sanitization. → Bibliothek ergänzen (härtet gegen `$`-Operatoren).
- [ ] **SEC14 (k)** `server/src/index.ts:88` CORS `origin: true` im Dev;
  `server/src/routes/contactRoutes.ts` `/test`-Route; `productImageController.ts:31`
  `Math.random()` für Upload-Dateinamen (unkritisch, Konsistenz).

### Geprüft und in Ordnung (NICHT „reparieren")

- Passwort-Hashing bcrypt mit Salt (10 Runden); Reset-/Confirm-Tokens via
  `crypto.randomBytes(32)`, Einmal-Verwendung (Token nach Nutzung gelöscht).
- Admin-Login ohne User-Enumeration (gleiche Fehlermeldung).
- `ADMIN_SETUP_KEY`-Anlage durch adminExists-Check abgesichert.
- **IDOR geprüft**: Invoice-Abruf nutzt vendorId aus dem Token
  (`invoiceController.ts:34-36`), kein Fremdzugriff; Buchungen mit
  Ownership-Check. Keine Kreditkarten-/IBAN-Daten im Code (Zahlung läuft über
  flour.io-Cloud) — housnkuh speichert nur Rechnungsbeträge/Provisionen.
- Keine `.env` getrackt (nur `.env.example`).

## Nachträglich gefunden (bei Umsetzung)

- [x] **BUG-INV-TAX (K)** ✅ behoben 2026-07-07. `Invoice.tax` ist einheitlich der
  absolute USt-Betrag (wie gespeichert + vom Client gelesen). Drei Satz-Deuter
  korrigiert: Pre-Save-Hook (`subtotal+tax`), invoicePdfService, invoice.hbs.
  Integrationstests prüfen Endsummen. Offen: falls bereits Bestandsrechnungen in
  Prod existieren, deren totalAmount einmalig neu berechnen (hier keine bekannt).

### Beim Test-Drift-Cleanup T5.5 gefunden (2026-07-07, verifiziert, NICHT gefixt)

- [x] **BUG-INV-TAX-REST (K)** ✅ behoben 2026-07-07: `generateInvoice()` setzt
  `tax` jetzt als gerundeten absoluten Betrag (`subtotal*0.19`) und
  `totalAmount = subtotal + tax` — gleiches Muster wie der Monatslauf.
  Tests auf Soll-Werte umgestellt (tax 23,75 €/total 148,75 €). Alt: `tax: 0.19`
  (Satz) → Pre-Save-Hook machte daraus Rechnungen mit 0,19 € „Steuer" im
  Ad-hoc/Bulk-Pfad (`generateInvoice`/`generateInvoiceWithPdf`).
- [x] **BUG-INV-RESEND (W)** ✅ gefixt 2026-07-08 (registrationStatus statt isActive). `resendInvoiceEmail` prüft `vendor.isActive` — das
  Feld existiert im User-Schema nicht (strict mode) → Endpoint antwortet für
  jeden Vendor 400 „Vendor ist nicht aktiv"; E-Mail-Resend faktisch tot.
- [x] **BUG-PDF-RACE (W)** ✅ gefixt 2026-07-08 (Browser-Promise, close nur in cleanup, inFlight-Guard; Parallel-Tests grün). `invoicePdfService`: geteilte Browser-Instanz +
  `closeBrowser()` im `finally` → parallele PDF-Aufrufe racen (ProtocolError).
  Betrifft auch Batch-Läufe, falls je parallelisiert.
- [x] **BUG-INV-DUP (W)** ✅ gefixt 2026-07-08 (Unique-Index vendor+period, E11000→AppError 400, Claim-Rollback). Duplikatsprüfung in `generateMonthlyInvoice` ist nicht
  atomar (find-then-insert, kein Unique-Index vendor+period) → parallele Läufe
  können Doppel-Rechnungen erzeugen; Controller antwortet bei „already exists"
  mit 500 statt 400.
- [x] **BUG-INV-JOB-NULL (W)** ✅ gefixt 2026-07-08 (null→Skip, totalAmount statt amount). `InvoiceGenerationJob.run()` liest
  `invoice.amount` — bei „keine abrechenbaren Positionen" gibt
  `generateMonthlyInvoice` `null` zurück → TypeError wird als Vendor-Fehler
  gezählt statt sauber übersprungen; `amount` existiert am Model ohnehin nicht
  (`totalAmount`).
- [x] **BUG-BP-SYNC-QUERY (W)** ✅ gefixt 2026-07-08 ($expr-Feldvergleich). `businessPartnerSyncService.ts:78` nutzt
  `{ updatedAt: { $gt: '$flourioLastSyncAt' } }` in normaler Query — der String
  wird nicht als Feldreferenz aufgelöst (bräuchte `$expr`); der Zweig „synced,
  aber seither geändert" greift via DB-Query nie (In-Memory-Prüfung
  `hasVendorChanged` kompensiert teilweise).
- [x] **BUG-ALERT-STATS (W)** ✅ gefixt 2026-07-08 (deklariertes Shape aus DB-Pfad; unawaited-Promise-Folgebug in getMonitoringStatistics mitgefixt). `AlertingService.getAlertStatistics()`:
  deklarierter Typ verspricht `bySeverity: {…}` (nur aktive), DB-Pfad liefert
  flache Struktur über ALLE Alerts der letzten 30 Tage → Konsumenten von
  `stats.bySeverity.x` bekommen `undefined`.
- [x] **BUG-INVDASH-CURRENCY (W, Client)** ✅ gefixt 2026-07-08 (isCurrency-Prop statt Titel-Heuristik). `InvoiceDashboard.tsx` StatCard:
  Währungsformatierung nur bei `title.includes('revenue')` — Titel sind deutsch
  („Gesamt Umsatz") → Umsätze erscheinen als rohe Zahl statt „25.000,50 €".
- [x] **KON-MANUALINV (S, Client)** ✅ gefixt 2026-07-08 (apiUtils/tokenStorage; toter useAuth-Import weg). `ManualInvoiceGenerator.tsx`: hartkodierte
  `/api/...`-URLs + direkter `localStorage`-Zugriff statt
  `apiUtils.getApiUrl()`/`tokenStorage` (Stil des T0.4-Fixes nachziehen);
  dazu toter `useAuth`-Import in `InvoiceDashboard.tsx`.

## Betrieb & Robustheit (Durchlauf 1d)

Kontext: Kasse läuft in flour.io-Cloud, Kiosk-Terminals sind reine Browser
(kein housnkuh-Code), MongoDB lokal, Server als `node dist/index.js`. Befunde
selbst verifiziert; Agent-Einschätzungen wo nötig korrigiert.

### Kritisch

- [x] **OP1 ✅ (T3.1) globale uncaughtException/unhandledRejection-Handler in index.ts. (K)** `server/src/index.ts` — kein `process.on('uncaughtException')`
  / `unhandledRejection`. SIGTERM/SIGINT-Shutdown existiert, aber eine
  unbehandelte Rejection in irgendeinem async-Pfad reißt den Prozess ohne Log
  ab (→ housnkuh-Backend offline, Kiosk-Kasse selbst läuft weiter, da Cloud).
  Hinweis: die flour.io-Sync-Jobs sind selbst try/catch-gekapselt (s. OK-Liste),
  das Risiko liegt bei anderen Pfaden. → globale Handler mit Logging + kontrolliertem Neustart.
- [x] **OP2 ✅ (T3.1) MongoDB-Verbindungs-Event-Handler (disconnected/reconnected/error). (K)** `server/src/config/db.ts` — `mongoose.connect()` einmalig,
  keine Reconnect-/Monitoring-Konfiguration. Bei DB-Verbindungsverlust laufen
  Requests dauerhaft in Fehler statt zu recovern. → Reconnect/serverMonitoring
  konfigurieren, Verbindungs-Events loggen.
- [x] **OP3 ✅ (T3.1) checkFlourio im Health-Check. (K)** `healthCheckService.ts` prüft DB, E-Mail, Jobs, Memory, Disk —
  **aber nicht flour.io**. Ein flour.io-Ausfall (veraltete Bestände → Kasse
  verkauft nicht Verfügbares) bleibt unbemerkt. → `checkFlourioConnection()`
  ergänzen und in `/health/detailed` aufnehmen.
- [x] **OP4 ✅ (T3.1) RateLimitHandler wiederholt auch Netzwerkfehler. (K)** `flourio/client/RateLimitHandler.ts` + `errorHandler.ts` —
  Retry/Backoff greift nur bei HTTP 429; echte Netzwerkfehler (ECONNREFUSED/
  ETIMEDOUT) werden geworfen, nicht wiederholt. → Netzwerkfehler in die
  Retry-Logik aufnehmen.

### Wichtig

- [ ] **OP5 (W)** `server/src/jobs/invoiceGenerationJob.ts:184` — Retry nach
  Fehler via `setTimeout(… , 3600000)`: lebt nur im RAM, geht bei Neustart
  verloren, kann sich stapeln. → über node-cron/Queue mit Backoff persistieren.
- [ ] **OP6 (W)** Flourio-Sync-Fehler setzen `flourioSyncStatus='error'` ohne
  Retry-Zähler/Wiedervorlage (warehouseSyncService u. a.). Fehler-Items
  bleiben liegen bis manuelles Admin-Retry. → `flourioSyncRetryCount`/
  `lastAttempt`, gezielte Wiederholung im nächsten Lauf.
- [x] **OP7 (W) ✅ (T4.4)** `alertAdminOfEmailFailure()` ruft jetzt
  `AlertingService.alertEmailDeliveryFailure` (Admin-Empfänger, 15-min-Cooldown,
  E-Mail/Webhook/DB-Alert). Alt: war nur ein TODO — nach 3 Fehlversuchen
  (z. B. Rechnungs-Mail) wurde niemand informiert → stiller Verlust.
- [ ] **OP8 (W)** `emailQueue.ts` — Fällt Redis aus, geht die Queue in einen
  In-Memory-Fallback: E-Mails im RAM, bei Neustart verloren. → Redis als
  erforderlich behandeln oder persistente Fallback-Queue.
- [x] **OP9 (W)** ✅ (2026-07-08: running-Lock in stockPullJob+documentSyncJob wie salesInvoiceJob, 4 Tests; Call-Timeout weiterhin offen → OP14/Robustheit) stockPullJob/documentSyncJob ohne Ausführungs-Lock: `isRunning()`
  prüft nur, ob der Cron *geplant* ist, nicht ob ein Lauf *aktiv* ist. Hängt ein
  Lauf länger als das Intervall, startet der nächste parallel → Race beim
  Bestands-Update. Auch kein Call-Timeout (AbortController). → Lauf-Flag + Timeout.
- [ ] **OP10 (W)** Graceful Shutdown stoppt Jobs und ruft sofort `process.exit(0)`
  ohne auf laufende Jobs zu warten → halbfertige Invoice-Generierung möglich.
  → Shutdown mit Grace-Timeout auf laufende Jobs.
- [ ] **OP11 (W)** `alertingService` — unklar, ob Alerts tatsächlich zugestellt
  werden (E-Mail/Kanal) oder nur als DB-Eintrag existieren. → Zustellweg
  verifizieren/implementieren (hängt mit OP7 zusammen).
- [x] **OP12 (W) ✅ (T3.2) backupJob** — mongodump+Retention. Alt: `.env.example` dokumentiert `BACKUP_SCHEDULE` etc.,
  aber es gibt **keinen** Backup-Job im Code. Kein automatisches mongodump →
  bei Datenverlust keine Wiederherstellung. → Backup-Job oder dokumentierten
  systemd-Timer mit `mongodump`.
- [x] **OP13 (W) ✅ (T3.2) ecosystem.config.js + Ops-Doku.** Alt: kein Deployment-Artefakt im Repo (keine systemd-Unit, kein
  PM2-`ecosystem.config.js`, kein Start-Skript). Nach Reboot kein Autostart. →
  systemd-Unit oder PM2-Config versionieren (verbindet sich mit der offenen
  Deployment-/Kiosk-Update-Frage aus ARCHITECTURE.md).
- [ ] **OP14 (W)** Ungetestete kritische Pfade: flour.io-Ausfallszenarien
  (kein stockPullJob-Test), MongoDB-Reconnect, Graceful Shutdown. → gezielte
  Tests für Ausfall-/Recovery-Verhalten (unabhängig von der Test-Drift S5).

### Geprüft und in Ordnung (NICHT „reparieren")

- flour.io-Sync-Jobs (`stockPullJob`/`documentSyncJob`) sind vollständig in
  try/catch mit Logging gekapselt → ein Ausfall crasht den Prozess nicht.
- Invoice-Batch isoliert pro Vendor (try/catch je Vendor) → ein Fehler blockiert
  nicht den ganzen Lauf.
- RateLimitHandler mit Exponential Backoff für 429 (3 Retries, max 60 s).
- E-Mail-Queue mit Backoff + synchronem Notfall-Send.
- Health-Checks laufen parallel mit Per-Check-Timeout (`Promise.allSettled` +
  `race`), ein langsamer Check blockiert die anderen nicht.
- Winston-Logging: Level per ENV, in Prod Daily-Rotate (30 Tage, 20 MB).

## Konsistenz & TypeScript (Durchlauf 1c)

Zahlen selbst nachgezählt (ohne Testdateien), daher teils niedriger als die
Agent-Schätzung.

### Wichtig

- [x] **KON1 (W)** ✅ (T5.1, 2026-07-07) 183 catch-500er auf
  `next(new AppError(message, 500, cause))` migriert; errorHandler sendet
  einheitliches Shape `{success:false, message}` und loggt zentral.
  Rest (~22 Stellen, dokumentiert im T5.1-Commit): Handler mit
  client-sichtbarem `error`-Zusatzfeld (flourio-/produkt-Controller —
  Follow-up: darf das Detail-Leak entfallen?), Monitoring-Formate,
  500er außerhalb von catch. Alt: 214× direktes `res.status(500)`,
  Shapes gemischt.
- [x] **KON2 (W)** ✅ Hotspots (T5.3): req/res-any in Handlern + catch-any→unknown typisiert (Warnings 61→20 auf den Dateien). Flächendeckendes any-Cleanup bewusst nicht Scope. Alt: `any` weit verbreitet: ~464× Server, ~172× Client. Hotspots
  mit `req: any`/`res: any` (flourioController, vendorProductController,
  einzelne Routes) — dort am wertvollsten zu typisieren. → Express-Handler
  typisieren, `catch (error: unknown)` statt `: any` (aktuell ~54× `catch(...: any)`).
- [ ] **KON3 (W)** API-Basis-URL im Client 4× mit falschem `:5000`-Fallback
  (VendorLogin/Reset/Settings/ForgotPassword) statt `:4000`; insgesamt in ~82
  Dateien inline statt zentral. Deckt sich mit S14. → eine `config/api.ts`
  bzw. `apiUtils.getApiUrl()` konsequent nutzen.
- [ ] **KON4 (W)** 53× inline `require(...)` in `.ts` (statt `import`),
  meist in if-Zweigen/Funktionen — Verdacht: Umgehung zirkulärer Importe. →
  Ursache (Zyklen) beheben und auf `import` umstellen; nicht blind ersetzen.
- [x] **KON5 (W)** ✅ (mit T5.1/KON1 erledigt) Services ohne eigenes try/catch
  sind jetzt strukturell abgesichert: Controller-catches leiten via
  `next(new AppError(...))` an den zentralen errorHandler (loggt Stack+cause),
  für Handler ohne try/catch existiert `asyncHandler`. Services bleiben
  bewusst throw-basiert.

### Kosmetisch

- [ ] **KON6 (k)** Deutsch/Englisch-Mix in Bezeichnern über Domänenbegriffe
  hinaus (`zusatzleistungenCosts`, `lagerserviceKosten`, `monatlicheKosten`).
  Konvention „Domäne deutsch, Technik englisch" festschreiben.
- [ ] **KON7 (k)** Nur relative Imports, keine Pfad-Aliase (`@utils/…`);
  tiefe `../../../`-Ketten. → optional tsconfig-Paths einführen.
- [ ] **KON8 (k)** tsconfig Server minimalistischer als Client (beide
  `strict:true`, aber Client mit `noFallthroughCasesInSwitch`,
  `isolatedModules` etc.). → angleichen.
- [ ] **KON9 (k)** Non-null-Assertions (`!`): ~17× Server, ~25× Client →
  wo einfach, durch `?.`/Guards ersetzen.

### Geprüft und in Ordnung

- async/await durchgängig (nur ~6× `.then()`), keine Callback-Ketten.
- `@ts-ignore` minimal (1× Server, 0× Client), kein `@ts-nocheck`.
- Datei-Header `@file`/`@purpose` zu 94–97 % vorhanden.
- HTTP-Statuscodes werden sinnvoll differenziert (400/403/404/500).
- Datei-Casing konsistent (Controller/Services camelCase).

---

# Priorisierte Gesamt-Reihenfolge (Ende Phase 1)

Reihenfolge fürs Abarbeiten in Phase 3 (Sicherheit/Daten → Konsistenz →
Kosmetik). Jede Kategorie vor Beginn kurz mit Eva abstimmen.

### Stufe 0 — Sofort, kleiner Aufwand, hoher Schutz (Sicherheit/Daten)
1. **SEC2** `/debug/clear-cache` hinter Auth (oder weg) — 1 Zeile.
2. **SEC1 + S1** getrackten Admin-JWT & Debug-Skripte enttracken; `JWT_SECRET`
   rotieren (macht den Token wertlos).
3. **S2/S3** getrackte Nutzerbilder & DB-Backups enttracken (Datenschutz).
4. **SEC4** Token-`console.log` in InvoiceDashboard entfernen (mit S19).
5. **SEC7** `/setup`-Validierung reaktivieren, `/test-setup` & `/test`-Routen entfernen.

### Stufe 1 — Robustheit gegen Ausfälle (Betrieb, vor „fertig")
6. **OP1** globale `uncaughtException`/`unhandledRejection`-Handler.
7. **OP2** MongoDB-Reconnect konfigurieren.
8. **OP4 + OP3** flour.io: Netzwerkfehler-Retry + Health-Check.
9. **OP12/OP13** Backup-Job + systemd/PM2 ins Repo (löst auch Deployment-Lücke).
10. **OP5/OP7/OP11** Invoice-Retry robust, Admin-Alert bei E-Mail-Fehlern.

### Stufe 2 — Sicherheit zweiter Ordnung
11. **SEC3** RegExp-Injection in Vendor-Suche escapen.
12. **SEC6/SEC9** NODE_ENV-abhängige Bypässe/Dev-Secret absichern.
13. **SEC10/SEC11** Profil-Validierung, CSP `unsafe-inline` entfernen.
14. **SEC5** Vendor-Login-Passwort-Policy-Problem (UX) — siehe [[project_vendor_auth_issues]].

### Stufe 3 — Konsistenz (erleichtert späteres Feature-Bauen)
15. **KON3/S14** zentrale API-URL im Client (behebt `:5000`-Bug).
16. **KON1/KON5** Fehlerbehandlung auf zentrale Middleware vereinheitlichen.
17. **S13/S8** Preisformatierung auf `PriceFormatter` migrieren.
18. **KON2** `any`-Hotspots (Express-Handler) typisieren.
19. **KON4** `require()`→`import` (nach Zyklus-Analyse).
20. **S16/S17** Cache-Strategie & `emailService`-Modularisierung (je eigener Task).

### Stufe 4 — Kosmetik / Aufräumen
21. **S6/S7/S9/S10/S11/S12** verwaisten Code & Dateien löschen (nach Freigabe).
22. **S19/S20/S21** Debug-Tool, console.logs, auskommentierte Routen entfernen.
23. **S5** Test-Drift-Cleanup (eigener Pass).
24. **KON6–KON9, S18** Namenskonvention, Pfad-Aliase, tsconfig angleichen, Trial-Services prüfen.

### Bewusst KEINE Aktion (funktioniert / Absicht)
- Badge-Komponenten-Familie, geprüfte Auth-Mechanismen (bcrypt, Reset-Tokens,
  Invoice-IDOR), gepinnte three-Versionen, fehlende mietfachId an Produkten,
  flour.io-API-Eigenheiten (`_id`, Bild-Objekte) — siehe CLAUDE.md No-Gos.

---

*Phase 1 abgeschlossen 2026-07-06. Nächster Schritt: Phase 2 (FEATURES.md,
gemeinsame Feature-Landkarte) — oder direkt Stufe 0 der Fixes, falls gewünscht.*
