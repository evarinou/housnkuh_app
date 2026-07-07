# housnkuh – TODO (Fahrplan Phase 4)

> Abgeleitet aus [FEATURES.md](FEATURES.md) („Fehlt noch" + „muss überarbeitet")
> und [AUDIT.md](AUDIT.md). Abarbeitung: ein Punkt = ein Commit; nach jedem Punkt
> Akzeptanzkriterien prüfen und hier abhaken. Vor jeder Stufe kurz mit Eva
> abstimmen. Stand: 2026-07-06.
>
> Reihenfolge-Logik: erst Sicherheit/Bugs (Minuten, hoher Schutz) → dann das
> Verkaufsdaten-Fundament (trägt die drei Abrechnungs-Features gemeinsam) →
> Abrechnung (Kern-Business) → Produktionsreife → restliche Features →
> Konsistenz/Aufräumen.

## Stufe 0 – Sicherheit & Sofort-Bugfixes

- [x] **T0.1 – Offene Debug-Route schließen** (AUDIT SEC2). ✅ Route
  `POST /admin/debug/clear-cache` entfernt (war ohne Auth erreichbar, kein
  Aufrufer). Commit.
- [x] **T0.2 – „Getrackter Admin-JWT" (AUDIT SEC1) — FEHLALARM, kein Handeln
  nötig.** ✅ Gegenprüfung: `server/scripts/test-with-real-token.js` wurde
  **nie committet** (nicht in der Historie), fällt jetzt unter die
  `server/scripts/*`-Ignore-Regel. Der volle echte flour.io-Token liegt in
  **keiner** getrackten Datei; die Tokens in `docs/flourio-api-v3/*` sind
  abgeschnittene Beispiele (`…`). → keine `JWT_SECRET`-Rotation aus diesem
  Grund erzwungen (optional als Hygiene). SEC1 in AUDIT.md korrigiert.
- [x] **T0.3 – Vendor-Login-Bug: falscher API-Port** (AUDIT KON3/S14). ✅ Alle
  vier Vendor-Seiten nutzen jetzt `apiUtils.getApiUrl()`; kein `:5000/api` mehr
  im Client. Commit.
- [x] **T0.4 – Token-Leak & Debug-Tool entfernen** (AUDIT SEC4/S19). ✅ Alle
  Debug-`console.log` in InvoiceDashboard entfernt (Token/Header-Leak weg),
  totes `utils/invoiceApi.js` gelöscht. Commit.

## Stufe 1 – Verkaufsdaten-Fundament (trägt F2a/F2c/F3)

- [x] **T1.1 – Vendor-Steuerstatus am Modell** (FEATURES F2a Krit. 4). ✅
  `vendorProfile.steuerstatus` (enum kleinunternehmer/regelbesteuert, Default
  'kleinunternehmer' §19) am User-Model + Interface; im Admin über
  VendorDetailModal pflegbar. In der Rechnungslogik via
  `user.vendorProfile.steuerstatus` abfragbar. Commit.
- [x] **T1.2 – Abrechenbarer Verkaufs-Ledger** (FEATURES ⚑-Befund). ✅
  `VendorSale`-Collection (Variante B): je FlourioDocument-Position eine Zeile,
  Vendor via `productId → Product.vendorId` (Zeilenebene), zwei unabhängige
  Zustände (`salesInvoice`/`provisionPeriod`). `VendorSaleProjectionService`
  projiziert idempotent (Unique-Index + `$setOnInsert`) nach jedem
  documentSyncJob-Lauf. Test (grün) deckt Vendor-Split, Auslassen
  unzuordenbarer Zeilen, Idempotenz + Zustandserhalt ab. Commit.
  ⚑ **Offen für F2a:** Netto/Brutto-Annahme (item.total = netto) und
  Belegtyp-Filter (`['invoice']`) mit echten flour.io-Daten validieren;
  einmaliger Backfill via `project()` ohne `since`.

## Stufe 2 – Abrechnung (Kern-Business)

- [x] **T2.1 – F2a Vendor-Verkaufsrechnung (Gutschriftsverfahren).** ✅ BACKEND
  KOMPLETT (12 Tests grün). Anzeige = T2.4/VendorCustomerInvoicesPage.
  Teilschritte:
  - [x] **Teil 1 – Modell + Aggregation** ✅ `SalesInvoice`-Modell +
    `salesInvoiceService` (USt je Steuerstatus, claim-first, pro-Vendor-Nummer),
    6 Tests grün.
  - [x] **Teil 2 – PDF** ✅ `salesInvoicePdfService` (Gutschrift-Layout, §19/USt,
    Ablage, pdfPath), HTML-Logik getestet + **echtes PDF end-to-end verifiziert**
    (Layout + USt-Rechnung korrekt). Deployment-Detail (→ T3.2): puppeteer 24.18
    ist auf Chrome **139** gepinnt; `npx puppeteer browsers install chrome` holt
    aber die *neueste* (150) → Mismatch. Lösung: entweder `npx puppeteer browsers
    install` (ohne Arg, installiert die gepinnte 139) ODER
    `PUPPETEER_EXECUTABLE_PATH` auf ein System-/Playwright-Chromium setzen
    (Service unterstützt das; puppeteer.launch nutzt die Env-Var auch für die
    bestehende invoicePdfService).
  - [x] **Teil 3 – 5-Min-Job** ✅ `salesInvoiceJob` mit In-Process-Lock
    (Audit OP9), `generateAll()` + `generatePending()` (Batch-PDF, self-healing),
    in scheduledJobs verdrahtet (+ Shutdown-Stop, manueller Trigger). 2 Tests.
  Ursprüngliche Beschreibung: 5-Min-Job,
  überlappungssicher (Lauf-Lock, AUDIT OP9), erzeugt pro Vendor eine
  aufgeschlüsselte Rechnung aus noch nicht abgerechneten Verkäufen; USt gemäß
  Vendor-Steuerstatus (T1.1); PDF via `invoicePdfService`; Ablage/Versand
  definiert; flour.io-Ausfall/unvollständige Daten sauber abgefangen (AUDIT
  OP4), ohne Verlust/Doppel-Abrechnung. Anzeige: `VendorCustomerInvoicesPage`.
  *Fertig, wenn:* alle sechs Akzeptanzkriterien aus FEATURES F2a erfüllt.
- [x] **T2.2 – F2c Provision im Monatslauf.** ✅ Positionstyp `provision`;
  `provisionService` claimt offene VendorSale-Zeilen (Netto) claim-first auf die
  Monatsrechnung (`provisionInvoice`), Rollback bei Fehler; in
  `generateMonthlyInvoice` integriert (nur Nicht-Trial-Vendors). 7 Tests grün.
  ⚠️ **Nachgelagert nötig:** BUG-INV-TAX (AUDIT) — Invoice-Tax-Semantik ist
  vorbestehend falsch (`totalAmount=subtotal*(1+tax)` mit absolutem tax) → die
  ausgewiesene USt/Gesamtsumme stimmt erst nach diesem Fix. Betrifft alle
  Monatsrechnungen, bewusst außerhalb F2c.
- [x] **T2.3 – F2b housnkuh-Rechnungsansicht anbinden.** ✅ `VendorHousnkuhInvoices-
  Page` nutzt jetzt die `InvoiceList`-Komponente (lädt `/invoices` mit
  Vendor-Token, Filter/Sortierung/Download), Detail via VendorInvoiceDetailPage.
  Build grün. Hinweis: InvoiceList navigiert zum Detail unter `/vendor/customer-
  invoices/:id` (funktioniert, aber Routen-Benennung mit T2.4 aufräumen).
- [x] **T2.4 – Verkaufsrechnungen-Anzeige (F2a) + F3 Vendor-Reporting.** ✅
  Backend: `vendorSalesInvoiceController` (Liste/Detail/PDF-Download der eigenen
  SalesInvoice + `/sales-report`-Aggregation), 3 Tests. Frontend:
  `VendorCustomerInvoicesPage` (Gutschriften-Liste + PDF-Download),
  `VendorReportsPage` (Kennzahlen, Monatsverlauf, Top-Produkte). Build grün.
  Offen (klein, T5): Routen-Benennung `customer-invoices/:id`-Detail vs.
  Sales-Invoices vs. housnkuh-Invoices sauber trennen.

## Stufe 3 – Produktionsreife (nötig für „fertig")

- [x] **T3.1 – Betriebs-Robustheit** (FEATURES F6 / AUDIT OP1–OP4). ✅
  OP1 globale Exception-Handler (index.ts), OP2 DB-Verbindungs-Events (db.ts),
  OP3 flour.io im Health-Check (healthCheckService), OP4 Retry bei
  Netzwerkfehlern (RateLimitHandler, 4 Tests). Build grün.
- [x] **T3.2 – Deployment & Backups** (FEATURES F5 / AUDIT OP12/OP13). ✅
  ecosystem.config.js (PM2, Single-Instance), backupJob (mongodump+Retention,
  3 Tests), docs/DEPLOYMENT_OPERATIONS.md (inkl. Kiosk/WiegePC + Puppeteer-
  Chrome-Falle). Ursprüngliche Beschreibung: systemd-
  Unit oder PM2-Config im Repo (Autostart nach Reboot); automatische
  `mongodump`-Backups mit Retention; dokumentierte Kiosk-Einrichtung
  (Ubuntu-Autostart-Browser) + Update-/Wartungsweg; WiegePC-Setup dokumentiert.
  *Fertig, wenn:* Server startet nach Reboot automatisch, Backups laufen &
  sind wiederherstellbar, Kiosk-Setup ist reproduzierbar dokumentiert.

## Stufe 4 – Weitere Features

- [x] **T4.1 – F1 Öffentliche Produktsuche.** ✅ publicProductService + GET /public/products (Volltext via Product-Text-Index, Filter Ort/Tag/Verfügbarkeit, nur öffentliche Felder, 5 Tests); ProduktePage /produkte + Nav-Link. Build grün. ~~Öffentlicher Endpunkt auf dem
  vorhandenen Product-Text-Index + Frontend-Seite mit Filter (Art/
  Zertifizierung/Standort). Nur öffentliche Felder ausliefern (vgl. AUDIT
  SEC3/öffentliche Projektionen). *Fertig, wenn:* Käufer produktübergreifend
  suchen/filtern und zum Vendor-Profil gelangen.
- [x] **T4.2 – F4 flour.io-BusinessPartner-Sync verdrahten.** ✅ syncVendorToFlourio in preRegister + registerWithBooking (nicht-blockierend, Token-Guard, Fehler→flourioSyncStatus=error), 2 Tests. OFFEN (klein): Warehouse-Sync verdrahten + periodischer Retry fehlgeschlagener Syncs. ~~Bei Vendor-
  Registrierung automatisch flour.io-BusinessPartner anlegen/verknüpfen
  (Service existiert); Warehouse-Sync mitklären. *Fertig, wenn:* neuer Vendor
  landet automatisch als BusinessPartner in flour.io, Fehler werden geloggt
  (kein Registrierungs-Abbruch bei Sync-Fehler).
- [x] **T4.3 – F7 Echtzeit-Updates via WebSocket.** ✅ socket.io auf dem
  bestehenden HTTP-Server: `socketService` (JWT-Handshake-Auth wie vendorAuth,
  Raum je Vendor, bookingEvents-Brücke, Shutdown-Close; 6 Tests inkl. echter
  Socket-Verbindungen). confirm + reject emittieren jetzt beide Status-Events
  (neu: `BookingStatus.REJECTED`, nur für Events). Client: gemeinsamer
  `vendorSocket` (Token aus localStorage, Disconnect bei Logout), Hooks
  refetchen auf `dashboard:refresh`/`booking:updated`; 30/60-s-Polling nur
  noch als Fallback ohne Verbindung, Auto-Reconnect via socket.io (7 Hook-
  Tests). Nginx: `location /socket.io` in setup-vps.sh + Hinweis für
  Bestandsinstallationen in DEPLOYMENT_OPERATIONS.md. Smoke-Test gegen
  kompilierten Server grün. ~~`useBookingUpdates`/
  `useDashboardMessages` von Polling auf WebSocket umstellen. *Fertig, wenn:*
  Dashboard-Updates ohne 30/60-s-Polling ankommen, Fallback bei Verbindungsverlust.~~
- [x] **T4.4 – F8 kleine Lücken.** ✅ `sendBookingRejectionEmail` (DB-Template
  `booking_rejection` + Hardcoded-Fallback) in `rejectPendingBooking` verdrahtet
  — nicht-blockierend, mit Ablehnungsgrund aus `req.body.reason`;
  `emailQueue.alertAdminOfEmailFailure` ruft jetzt
  `AlertingService.alertEmailDeliveryFailure` (Admin-Empfänger aus DB,
  15-min-Cooldown, E-Mail/Webhook/DB-Alert-Pipeline). 5 neue Tests grün;
  nebenbei Spy-Leak in alertingService.test.ts gefixt (restoreAllMocks).
  ~~Vendor-Mail bei Ablehnung einer Buchung
  (`rejectPendingBooking`-TODO); Admin-Alert bei E-Mail-Versandfehlern (AUDIT
  OP7). *Fertig, wenn:* abgelehnte Vendors werden benachrichtigt; wiederholte
  Mail-Fehler erreichen den Admin.~~

## Stufe 5 – Konsistenz & Aufräumen (Audit Stufe 3/4)

- [x] **T5.1 – Fehlerbehandlung vereinheitlichen** (AUDIT KON1/KON5). ✅
  Fundament: AppError (statusCode+cause), errorHandler mit Standard-Shape
  `{success:false, message}` (AppError unmaskiert, nackte Errors in Prod
  maskiert, zentrales Logging mit cause-Stack), asyncHandler,
  apiResponse.fail mit top-level message. 183 catch-500er in Controllern/
  Routes/Middleware auf `next(new AppError(...))` migriert —
  verhaltenserhaltend (Status/Shape/Message identisch). ~22 dokumentierte
  Ausnahmen (client-sichtbare error-Zusatzfelder in flourio-/produkt-
  Controllern, Monitoring-Formate, Nicht-catch-500er) — Follow-up, wenn
  das error-Detail-Feld entfallen darf. Volle Suite grün.
- [ ] **T5.2 – Preisformatierung zentralisieren** (AUDIT S13/S8): auf
  `PriceFormatter` migrieren.
- [ ] **T5.3 – `any`-Hotspots typisieren** (AUDIT KON2): Express-Handler,
  `catch (error: unknown)`.
- [ ] **T5.4 – Toten Code & Altlasten entfernen** (AUDIT S1/S2/S3/S6–S12,
  KON4 require→import): getrackte Debug-Skripte/Backups/Bilder enttracken,
  verwaiste Dateien löschen — nach Freigabe.
- [x] **T5.5 – Test-Drift-Cleanup** (AUDIT S5). ✅ Alle 25 gedrifteten Suiten
  repariert (flour.io 8, Invoice 9, E-Mail/Alerting 3, Client 5), alle
  untracked Tests committet. Nur 5 Client-Tests gelöscht (testeten belegt
  entfernte/nie existierende UI: Tag-Kategorien, Verfügbarkeits-Feld,
  Auto-Sync-Checkbox). Jest-Worker auf 50 % begrenzt (MongoMemoryServer/
  Puppeteer-Ressourcensturm). **Beide Suiten komplett grün: Server 62 Suiten/
  897 Tests, Client 29 Suiten/303 Tests.** 9 dabei gefundene Produktionsbugs
  in AUDIT.md („Beim Test-Drift-Cleanup T5.5 gefunden") dokumentiert —
  wichtigster: BUG-INV-TAX-REST (generateInvoice setzt noch tax=0.19 als
  Satz; vor Rechnungs-Go-live fixen). ~~untracked Tests reparieren/
  löschen/committen; danach ist ein `git push` (mit grüner Suite) möglich.~~

---

*Nach T5.5 sind Working Tree und Tests sauber genug für den ersten `git push`.
Empfohlener Start: Stufe 0 (Minuten), dann T1.1/T1.2 als Fundament.*
