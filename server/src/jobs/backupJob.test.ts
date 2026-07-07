/**
 * @file backupJob.test.ts
 * @purpose Sichert die Retention-Bereinigung des Backup-Jobs (löscht nur alte
 *          Backup-Archive, lässt frische und fremde Dateien in Ruhe).
 */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { BackupJob } from './backupJob';

const DAY = 24 * 60 * 60 * 1000;

describe('BackupJob.cleanupOldBackups', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'housnkuh-backup-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const writeBackup = async (name: string, ageDays: number) => {
    const full = path.join(dir, name);
    await fs.writeFile(full, 'dummy');
    const t = new Date(Date.now() - ageDays * DAY);
    await fs.utimes(full, t, t);
  };

  it('löscht Backups älter als die Retention, behält frische', async () => {
    await writeBackup('housnkuh-2026-06-01.archive.gz', 40); // alt
    await writeBackup('housnkuh-2026-07-05.archive.gz', 2);  // frisch

    const deleted = await BackupJob.cleanupOldBackups(dir, 30);

    expect(deleted).toBe(1);
    const rest = await fs.readdir(dir);
    expect(rest).toEqual(['housnkuh-2026-07-05.archive.gz']);
  });

  it('lässt fremde Dateien unangetastet', async () => {
    await writeBackup('housnkuh-2026-01-01.archive.gz', 100); // alt, wird gelöscht
    await writeBackup('wichtige-notiz.txt', 100);              // fremd
    await writeBackup('mietfaecher-backup.json', 100);         // fremd

    const deleted = await BackupJob.cleanupOldBackups(dir, 30);

    expect(deleted).toBe(1);
    const rest = (await fs.readdir(dir)).sort();
    expect(rest).toEqual(['mietfaecher-backup.json', 'wichtige-notiz.txt']);
  });

  it('gibt 0 zurück, wenn das Verzeichnis nicht existiert', async () => {
    const deleted = await BackupJob.cleanupOldBackups(path.join(dir, 'gibtsnicht'), 30);
    expect(deleted).toBe(0);
  });
});
