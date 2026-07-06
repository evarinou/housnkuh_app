# housnkuh – Audit (Fahrplan Phase 1)

> Bestandsaufnahme ohne Fixes. Abarbeitung erst in Phase 3 (Reihenfolge:
> Sicherheit/Daten → Konsistenz → Kosmetik). Erledigtes wird hier abgehakt.
> Prioritäten: **K** = kritisch · **W** = wichtig · **k** = kosmetisch.
> Stand Durchlauf 1a: 2026-07-06. Befunde maschinell gesucht und stichprobenartig
> per Import-Grep verifiziert (verwaiste Dateien alle bestätigt).

## Struktur (Durchlauf 1a: toter Code, Verwaiste, Duplikate)

### Getrackte Altlasten im Repo

- [ ] **S1 (K)** `server/scripts/debug/` — 25 getrackte Debug-Einmalskripte
  (debug-auth.js, debug-revenue.js, check-pending-bookings.js …). Gehören nicht
  ins Repo; ob sie Secrets/echte IDs enthalten prüft Durchlauf 1b.
  → `git rm --cached` + .gitignore-Abdeckung.
- [ ] **S2 (K)** `server/uploads/vendor-images/` — echte Nutzerbilder getrackt
  (Datenschutz!). Neue sind seit 2026-07-06 ignoriert, alte noch im Repo
  (und in der Historie). → enttracken; History-Rewrite separat entscheiden.
- [ ] **S3 (W)** `server/backups/*.json` — 3 DB-Dumps/Reports von 2025-06-25
  getrackt (Mietfächer-Backups). → enttracken.
- [ ] **S4 (W)** `server/scripts/DANGEROUS-*.disabled` — 3 deaktivierte
  Destruktiv-Skripte (clear-all-data, seed-db, create-sample-data) getrackt.
  → löschen oder bewusst behalten (Eva entscheidet).
- [ ] **S5 (W)** ~90 untracked Test-Dateien mit bekannter Drift (~30 Client-,
  ~60 Server-Failures, erwarten alte UI/Endpunkte) + unkommittete Änderungen an
  `emailService.test.ts`/`adminController.test.ts`. → eigener Cleanup-Pass:
  reparieren was das aktuelle Verhalten testet, löschen was Altes testet,
  Rest committen (auch die grünen Ladenkarte-Tests).

### Verwaiste Dateien (Import-Grep bestätigt: keine Referenzen)

- [ ] **S6 (W)** `client/src/components/Features.tsx` (120 Z.) — fertige, nie
  eingebundene Komponente. → löschen oder bewusst einbauen.
- [ ] **S7 (W)** `client/src/components/ConstructionBanner.tsx` (185 Z.) —
  Eröffnungs-Countdown-Banner, nirgends importiert. Reaktivierungs-Kandidat
  oder löschen (Eva entscheidet — Feature-Frage für Phase 2).
- [ ] **S8 (W)** `client/src/utils/priceFormatting.ts` — zentrale
  `PriceFormatter`-Klasse mit 8 Methoden, wird von NIEMANDEM genutzt,
  während 14+ Komponenten eigene formatPrice/formatCurrency-Inlines haben
  (siehe S13). → Utility zum Standard machen, Inlines migrieren.
- [ ] **S9 (W)** `server/src/services/priceValidationService.ts` (170 Z.) —
  exportiert, nie importiert. → löschen oder in Produkt-Validierung einbinden.
- [ ] **S10 (W)** `server/src/config/database.ts` (226 Z.) — zweite
  DB-Config mit QueryPerformance/HealthCheck, nie importiert (aktiv ist
  `config/db.ts`). → löschen oder Monitoring-Teile übernehmen.
- [ ] **S11 (W)** `server/src/middleware/trialMiddleware.ts` — definiert, aber
  in keiner Route eingehängt. → klären: vergessen oder obsolet?
- [ ] **S12 (k)** Verwaiste Kleinteile: `server/src/utils/emailTestHelper.ts`
  (6,4 KB, Mailpit-Helfer), `server/src/utils/assignDemoTags.ts` (61 Z.,
  hartkodierte Test-Mail), `client/src/utils/clearAuth.js` (19 Z.,
  Legacy-Wrapper), `client/src/components/vendor/PaymentOptionsModal.css`
  (7,8 KB CSS ohne Komponente — .tsx existiert nicht), 4 ungenutzte Bilder in
  `client/src/assets/images/` (hero_bild.png, Hero_Medium/Small.png,
  primary_orange.svg). → löschen.

### Doppelte Logik

- [ ] **S13 (W)** Preisformatierung 14+-fach inline dupliziert
  (ArticleManagementPage, InvoiceDashboard, PriceBreakdownDisplay,
  BookingDetailModal, ProductCard, InvoiceDetail/List, VendorContractsPage,
  FlourioDocumentsPage, ProductLabelPrintModal …) statt `priceFormatting.ts`
  (siehe S8). → auf zentrale Utility migrieren.
- [ ] **S14 (W)** API-Basis-URL-Ermittlung in 41 Client-Dateien inline
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

- [ ] **S19 (W)** `client/src/utils/invoiceApi.js` — Debug-Werkzeug, das sich
  auf `/admin/invoice-dashboard` automatisch ausführt (fetch-Tests +
  console.logs in Produktion). → entfernen oder hinter Debug-Flag.
- [ ] **S20 (W)** console.log/error in 62 Client-Dateien (Hotspot:
  MietfachAssignmentModal „CRITICAL DEBUG"). → Lint-Regel `no-console`
  (warn) + Aufräum-Pass.
- [ ] **S21 (k)** Auskommentierte Routen/Importe in `adminRoutes.ts`
  (M005-Routen, cacheMiddleware) und `flourioRoutes.ts`
  (`/tags/sync`, sauber als @deprecated markiert). → entfernen.
- [ ] **S22 (k)** TODO-Marker für nie gebaute WebSocket-Anbindung in
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

- [ ] **SEC1 (K)** `server/scripts/test-with-real-token.js:9` — echter Admin-JWT
  (`isAdmin: true`) **hartkodiert und git-getrackt**. Datei ist über die neue
  .gitignore nicht mehr erfasst, weil bereits tracked. → aus Index entfernen,
  Token als kompromittiert behandeln (JWT_SECRET rotieren macht ihn ungültig);
  History-Bereinigung erwägen. Hängt mit S1 (getrackte Debug-Skripte) zusammen.
- [ ] **SEC2 (K)** `server/src/routes/adminRoutes.ts:32` — `POST /api/admin/debug/clear-cache`
  ist VOR `router.use(adminAuth)` (Z. 47) registriert → **ohne Auth**
  aufrufbar, leert den gesamten Cache (DoS-Hebel). → Route hinter die
  Auth-Middleware verschieben oder entfernen.

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

---

*Durchläufe 1c (Konsistenz), 1d (Betrieb) folgen; die priorisierte
Gesamt-Reihenfolge entsteht am Ende von 1d.*
