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

- [ ] **T3.1 – Betriebs-Robustheit** (FEATURES F6 / AUDIT OP1–OP4). Globaler
  `uncaughtException`/`unhandledRejection`-Handler; MongoDB-Reconnect;
  flour.io-Health-Check; Retry auch bei flour.io-Netzwerkfehlern (nicht nur 429).
  *Fertig, wenn:* Prozess überlebt unerwartete Rejections geloggt, DB-Verlust
  wird recovered, `/health/detailed` zeigt flour.io-Status.
- [ ] **T3.2 – Deployment & Backups** (FEATURES F5 / AUDIT OP12/OP13). systemd-
  Unit oder PM2-Config im Repo (Autostart nach Reboot); automatische
  `mongodump`-Backups mit Retention; dokumentierte Kiosk-Einrichtung
  (Ubuntu-Autostart-Browser) + Update-/Wartungsweg; WiegePC-Setup dokumentiert.
  *Fertig, wenn:* Server startet nach Reboot automatisch, Backups laufen &
  sind wiederherstellbar, Kiosk-Setup ist reproduzierbar dokumentiert.

## Stufe 4 – Weitere Features

- [ ] **T4.1 – F1 Öffentliche Produktsuche.** Öffentlicher Endpunkt auf dem
  vorhandenen Product-Text-Index + Frontend-Seite mit Filter (Art/
  Zertifizierung/Standort). Nur öffentliche Felder ausliefern (vgl. AUDIT
  SEC3/öffentliche Projektionen). *Fertig, wenn:* Käufer produktübergreifend
  suchen/filtern und zum Vendor-Profil gelangen.
- [ ] **T4.2 – F4 flour.io-BusinessPartner-Sync verdrahten.** Bei Vendor-
  Registrierung automatisch flour.io-BusinessPartner anlegen/verknüpfen
  (Service existiert); Warehouse-Sync mitklären. *Fertig, wenn:* neuer Vendor
  landet automatisch als BusinessPartner in flour.io, Fehler werden geloggt
  (kein Registrierungs-Abbruch bei Sync-Fehler).
- [ ] **T4.3 – F7 Echtzeit-Updates via WebSocket.** `useBookingUpdates`/
  `useDashboardMessages` von Polling auf WebSocket umstellen. *Fertig, wenn:*
  Dashboard-Updates ohne 30/60-s-Polling ankommen, Fallback bei Verbindungsverlust.
- [ ] **T4.4 – F8 kleine Lücken.** Vendor-Mail bei Ablehnung einer Buchung
  (`rejectPendingBooking`-TODO); Admin-Alert bei E-Mail-Versandfehlern (AUDIT
  OP7). *Fertig, wenn:* abgelehnte Vendors werden benachrichtigt; wiederholte
  Mail-Fehler erreichen den Admin.

## Stufe 5 – Konsistenz & Aufräumen (Audit Stufe 3/4)

- [ ] **T5.1 – Fehlerbehandlung vereinheitlichen** (AUDIT KON1/KON5): zentrale
  `errorHandler`-Middleware nutzen, einheitliches Response-Shape.
- [ ] **T5.2 – Preisformatierung zentralisieren** (AUDIT S13/S8): auf
  `PriceFormatter` migrieren.
- [ ] **T5.3 – `any`-Hotspots typisieren** (AUDIT KON2): Express-Handler,
  `catch (error: unknown)`.
- [ ] **T5.4 – Toten Code & Altlasten entfernen** (AUDIT S1/S2/S3/S6–S12,
  KON4 require→import): getrackte Debug-Skripte/Backups/Bilder enttracken,
  verwaiste Dateien löschen — nach Freigabe.
- [ ] **T5.5 – Test-Drift-Cleanup** (AUDIT S5): untracked Tests reparieren/
  löschen/committen; danach ist ein `git push` (mit grüner Suite) möglich.

---

*Nach T5.5 sind Working Tree und Tests sauber genug für den ersten `git push`.
Empfohlener Start: Stufe 0 (Minuten), dann T1.1/T1.2 als Fundament.*
