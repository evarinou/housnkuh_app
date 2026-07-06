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

---

*Durchläufe 1b (Sicherheit), 1c (Konsistenz), 1d (Betrieb) folgen; die
priorisierte Gesamt-Reihenfolge entsteht am Ende von 1d.*
