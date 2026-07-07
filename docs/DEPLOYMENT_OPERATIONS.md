# housnkuh – Betrieb & Deployment (Operations)

> Konkrete Betriebsanleitung für den Produktivbetrieb. Ergänzt
> `scripts/setup-vps.sh` (VPS-Erstinstallation: Node, MongoDB, Nginx, HTTPS)
> und `docs/DEPLOYMENT_GUIDE.md` (Checklisten/Rollback).
> Zielumgebung (Stand 2026-07-07): **Cloud-VPS mit Domain housnkuh.de**,
> Prozessmanager **PM2**, Backups **in-App**. Erfüllt Audit OP12/OP13.

## Architektur im Betrieb

- **Server**: kompiliertes `server/dist/index.js`, Node 18, hinter Nginx
  (Reverse Proxy + HTTPS via certbot), Port 4000.
- **DB**: MongoDB auf demselben VPS (`mongodb://localhost:27017/housnkuh`).
- **POS/Kasse**: läuft in der flour.io-Cloud — nicht Teil dieses Deployments.
- **Kiosk-Terminals**: reine Browser (siehe unten), greifen auf `housnkuh.de`
  bzw. die flour.io-Kasse zu.

## Erstinstallation (VPS)

```bash
# 1. Grundinstallation (Node, MongoDB, Nginx, HTTPS)
bash scripts/setup-vps.sh          # ggf. Domain/Pfade darin anpassen

# 2. Code holen & bauen
git clone <repo> /opt/housnkuh && cd /opt/housnkuh
npm run install-all
cp server/.env.example server/.env # dann echte Werte eintragen (s. u.)
npm run build-all                  # client/build + server/dist

# 3. Chrome für PDF-Erzeugung (siehe Abschnitt „PDF/Chrome")
```

### Pflicht-Umgebungsvariablen (`server/.env`)

`MONGO_URI`, `JWT_SECRET` (stark!), `ADMIN_SETUP_KEY`, `NODE_ENV=production`,
`FLOURIO_BEARER_TOKEN`, `PUBLIC_SERVER_URL=https://housnkuh.de` (damit flour.io
absolute Bild-URLs bekommt), `CORS_ORIGINS`, E-Mail (`EMAIL_*`), Firmendaten
(`COMPANY_*`), Backups (`BACKUP_*`). Vollständig in `server/.env.example`.

## Prozessmanager (PM2)

`ecosystem.config.js` liegt im Repo-Root. **Single-Instance** ist Pflicht —
die In-Process-Jobs und Überlappungs-Locks (Verkaufsrechnungslauf, Backups)
setzen genau einen Prozess voraus.

```bash
npm --prefix server run build      # nach jedem Code-Update
pm2 start ecosystem.config.js      # bzw. `pm2 reload housnkuh-server`
pm2 save                           # aktuellen Prozess-Satz merken
pm2 startup                        # Autostart nach VPS-Reboot einrichten
pm2 logs housnkuh-server           # Logs
```

Damit greifen auch die Robustheits-Maßnahmen aus T3.1: Bei
`uncaughtException` beendet sich der Prozess kontrolliert und **PM2 startet
ihn neu**.

## Backups (in-App)

Der `backupJob` (in `scheduledJobs` registriert) ruft nach `BACKUP_SCHEDULE`
(Standard täglich 02:00) `mongodump` in ein komprimiertes Archiv unter
`BACKUP_STORAGE_PATH` und löscht Archive älter als `BACKUP_RETENTION_DAYS`.

- **Voraussetzung**: `mongodump` im PATH → `sudo apt install -y mongodb-database-tools`.
- **Manuell auslösen**: `ScheduledJobs.triggerBackup()` (z. B. via Admin-Route/Skript).
- **Wiederherstellen**: `mongorestore --gzip --archive=<datei>` (vorher testweise
  in eine Test-DB, siehe DEPLOYMENT_GUIDE.md).
- **Empfehlung**: `BACKUP_STORAGE_PATH` auf ein separates Volume legen und die
  Archive zusätzlich off-site kopieren (rsync/Objektspeicher).

## PDF/Chrome (Rechnungen)

Die Rechnungs-PDFs (housnkuh- und Verkaufsrechnungen) brauchen Chrome/Chromium.
**Falle**: `npx puppeteer browsers install chrome` lädt die *neueste* Version —
Puppeteer erwartet aber eine gepinnte. Zwei sichere Wege:

```bash
# A) Puppeteers gepinnte Version installieren (OHNE das Wort "chrome")
cd server && npx puppeteer browsers install

# B) System-Chromium nutzen und in server/.env setzen (empfohlen im Betrieb):
sudo apt install -y chromium
# server/.env:  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

Puppeteer nutzt `PUPPETEER_EXECUTABLE_PATH` automatisch — das gilt für beide
PDF-Services.

## Kiosk-Terminals (Laden)

Die 2 Kassen-Terminals sind reine Anzeige-/Bedien-Browser (Ubuntu, LAN,
kein housnkuh-Code). Einrichtung je Terminal:

- Browser (Chromium/Firefox) im **Kiosk-/Vollbildmodus** per Autostart auf die
  flour.io-Kassenoberfläche (bzw. `https://housnkuh.de` für Admin-Ansichten).
  Beispiel (Chromium): Autostart-Eintrag
  `chromium --kiosk --noerrdialogs --disable-session-crashed-bubble <URL>`.
- **Fest verkabelt (LAN)**, kein WLAN.
- **Updates**: Terminals brauchen keine App-Updates (sie laden die Cloud-
  Oberfläche); nur OS-/Browser-Sicherheitsupdates via `unattended-upgrades`.
- **WiegePC**: noch nicht konfiguriert (offener Punkt).

## Update-/Deploy-Ablauf (laufender Betrieb)

```bash
cd /opt/housnkuh
git pull
npm run install-all          # falls Dependencies geändert
npm run build-all
pm2 reload housnkuh-server    # Zero-Downtime-Reload
sudo nginx -t && sudo systemctl reload nginx   # nur bei Nginx-Änderungen
```

Vor dem Deploy: `cd server && npm test` und `npx tsc --noEmit` (Client + Server).

**WebSocket (seit T4.3):** Das Vendor-Dashboard nutzt socket.io unter dem Pfad
`/socket.io` (gleicher Port 4000). `scripts/setup-vps.sh` enthält den nötigen
Nginx-`location /socket.io`-Block (Upgrade-Header, langes `proxy_read_timeout`).
**Bestehende Installationen** müssen den Block manuell in
`/etc/nginx/sites-available/housnkuh.de` nachtragen, sonst fällt der Client
dauerhaft auf Polling zurück.

## Offene Punkte

- **Vor Rechnungs-Go-live**: die drei flour.io-Datenvalidierungen (Netto/Brutto,
  Belegtyp-Filter, Backfill) mit echten Kassendaten (siehe TODO T1.2/F2a).
- Off-site-Backup-Kopie einrichten.
- WiegePC konfigurieren.
