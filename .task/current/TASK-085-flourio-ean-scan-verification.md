# TASK-085: flour.io EAN-Kassenanbindung — Scan-Verifikation & Abschluss

**Status:** Implementierung fertig & live verifiziert (Sync) — physischer Scan-Test ausstehend
**Erstellt:** 2026-06-10

## Kontext

Jedes Produkt bekommt automatisch eine interne EAN-13 (Präfix 22, `server/src/utils/ean.ts`),
die beim Flourio-Sync ins `ean`-Feld des Artikels geschrieben und über das Etikett-Modal
(`ProductLabelPrintModal`, jsbarcode) gedruckt wird. Create- UND Update-Sync sind gegen die
echte flour.io-API verifiziert (Testartikel „Marmor Untersetzer", ean 2200000000019, kein
Duplikat, Bild angehängt). Etikettendruck funktioniert.

Dabei gefixt (Drift der handgeschriebenen API-Typen zur echten API):
- `article._id` statt `article.id` (sonst Duplikate bei jedem Re-Sync)
- `images` als Objekt-Array `[{url}]` statt String-URLs (PATCH validiert strikt → 400)
- `FlourioError.response` enthält den API-Body direkt (Fehlerdetails wurden verschluckt)

## User Acceptance Criteria

- [ ] Die zwei Alt-Duplikate vom 31.03.2026 im flour.io-Backend gelöscht
      („Test Marmor Untersetzer" / HK-TEST-001 und „Marmor Untersetzer" mit leerer EAN)
- [ ] Gedrucktes Etikett (EAN 2200000000019) an der flour.io-Kasse gescannt
      → Artikel „Marmor Untersetzer" mit 10,00 € erscheint im Warenkorb
- [ ] Gegenprobe: Handy-Barcode-App liest dieselben 13 Ziffern wie aufgedruckt

## Offene Folge-Tasks (aus dem Audit, separat priorisieren)

1. **Session-Arbeit committen** (logische Gruppen: cleanup / produkt-fixes / ean-feature /
   flourio-fixes / bild-upload / migrations) — Achtung: Pre-Push-Hook führt Tests aus,
   es gibt vorbestehende Fehlschläge in unkommittierten WIP-Testdateien
2. Flourio-Typen aus `docs/flourio-api-v3/swagger.json` generieren statt handpflegen
   (hätte alle drei obigen Bugs zur Compile-Zeit gefangen)
3. Auth: Login darf Passwort-Policy nicht validieren (Sonderzeichen-Whitelist sperrt
   legitime Passwörter aus); Setup-Fehlermeldung präzisieren; Index-Drop in setupAdmin entfernen
4. `PUBLIC_SERVER_URL` in Produktion setzen (sonst bekommt flour.io keine ladbaren Bild-URLs)
5. Tag-flourioId-Writeback fixen (flour.io liefert String-IDs) — nur relevant, falls
   Lose-Ware über Kategorie-Buttons an der Kasse verkauft werden soll
6. WIP-Test-Drift aufräumen (~30 Client-/~60 Server-Fehlschläge in unkommittierten Tests,
   erwarten alte UI/Endpoints — per Baseline-Worktree als vorbestehend verifiziert)
