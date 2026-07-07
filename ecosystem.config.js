/**
 * @file ecosystem.config.js
 * @purpose PM2-Prozesskonfiguration für den housnkuh-Server (Autostart + Restart).
 *
 * Betrieb:
 *   cd /pfad/zu/housnkuh_app
 *   npm --prefix server run build         # erzeugt server/dist
 *   pm2 start ecosystem.config.js
 *   pm2 save && pm2 startup               # Autostart nach Server-Reboot
 *
 * Der Server läuft als kompiliertes server/dist/index.js. Umgebungsvariablen
 * kommen aus server/.env(.local) (dotenv im Code) — hier wird nur NODE_ENV gesetzt.
 * Für die PDF-Erzeugung (Rechnungen) auf dem Server ggf. PUPPETEER_EXECUTABLE_PATH
 * in server/.env setzen (siehe docs/DEPLOYMENT_OPERATIONS.md).
 */
module.exports = {
  apps: [
    {
      name: 'housnkuh-server',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,           // Single-Instance: In-Process-Jobs/Locks setzen das voraus
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      time: true
    }
  ]
};
