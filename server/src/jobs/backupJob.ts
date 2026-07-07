/**
 * @file backupJob.ts
 * @purpose Automatische MongoDB-Backups per mongodump (Audit OP12).
 * @created 2026-07-07
 *
 * Nutzt die BACKUP_*-Variablen aus .env. Legt komprimierte Archive an und räumt
 * Backups älter als die Retention weg. Überlappungssicher (In-Process-Lock).
 * Voraussetzung im Betrieb: `mongodump` im PATH (mongodb-database-tools).
 */

import * as cron from 'node-cron';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import config from '../config/config';
import logger from '../utils/logger';

const BACKUP_PREFIX = 'housnkuh-';
const BACKUP_SUFFIX = '.archive.gz';

export class BackupJob {
  private static task: cron.ScheduledTask | null = null;
  private static running = false;

  static get schedule(): string { return process.env.BACKUP_SCHEDULE || '0 2 * * *'; }
  static get retentionDays(): number { return parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10); }
  static get storageDir(): string {
    const p = process.env.BACKUP_STORAGE_PATH || './backups';
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }

  static async run(): Promise<void> {
    if (BackupJob.running) {
      logger.warn('[BackupJob] Vorheriger Lauf läuft noch — übersprungen');
      return;
    }
    BackupJob.running = true;
    try {
      const dir = BackupJob.storageDir;
      await fs.mkdir(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(dir, `${BACKUP_PREFIX}${stamp}${BACKUP_SUFFIX}`);

      logger.info('[BackupJob] Starte mongodump', { file });
      await BackupJob.dump(config.mongoURI, file);
      logger.info('[BackupJob] Backup erstellt', { file });

      const deleted = await BackupJob.cleanupOldBackups(dir, BackupJob.retentionDays);
      if (deleted > 0) logger.info('[BackupJob] Alte Backups entfernt', { deleted });
    } catch (error: any) {
      logger.error('[BackupJob] Backup fehlgeschlagen', { error: error.message });
    } finally {
      BackupJob.running = false;
    }
  }

  /** Führt mongodump als komprimiertes Archiv aus (kein Shell → kein Injection-Risiko). */
  private static dump(mongoUri: string, file: string): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile('mongodump', [`--uri=${mongoUri}`, `--archive=${file}`, '--gzip'], (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(stderr?.trim() || err.message));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Löscht Backup-Archive, die älter als retentionDays sind. Rein fs-basiert
   * und dadurch testbar. Gibt die Anzahl gelöschter Dateien zurück.
   */
  static async cleanupOldBackups(dir: string, retentionDays: number): Promise<number> {
    let deleted = 0;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return 0; // Verzeichnis existiert (noch) nicht
    }
    for (const name of entries) {
      if (!name.startsWith(BACKUP_PREFIX) || !name.endsWith(BACKUP_SUFFIX)) continue;
      const full = path.join(dir, name);
      const stat = await fs.stat(full);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(full);
        deleted++;
      }
    }
    return deleted;
  }

  static init(): void {
    if (BackupJob.task) {
      logger.warn('[BackupJob] Already scheduled');
      return;
    }
    if (!cron.validate(BackupJob.schedule)) {
      logger.error('[BackupJob] Ungültiger BACKUP_SCHEDULE, Job nicht gestartet', { schedule: BackupJob.schedule });
      return;
    }
    BackupJob.task = cron.schedule(BackupJob.schedule, () => BackupJob.run(), { timezone: 'Europe/Berlin' });
    BackupJob.task.start();
    logger.info('[BackupJob] Scheduled', { schedule: BackupJob.schedule, retentionDays: BackupJob.retentionDays });
  }

  static stop(): void {
    if (BackupJob.task) {
      BackupJob.task.stop();
      BackupJob.task.destroy();
      BackupJob.task = null;
      logger.info('[BackupJob] Stopped');
    }
  }
}

export default BackupJob;
