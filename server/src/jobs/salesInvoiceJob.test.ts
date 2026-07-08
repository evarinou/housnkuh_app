/**
 * @file salesInvoiceJob.test.ts
 * @purpose Sichert den Überlappungs-Lock des Verkaufsrechnungs-Jobs: ein zweiter
 *          run() während eines laufenden run() wird übersprungen.
 *          Ergänzend (AUDIT OP14): isBusy() als Baustein des Graceful Shutdown
 *          in index.ts — true während eines Laufs, false danach/nach Fehlern.
 */

import { SalesInvoiceJob } from './salesInvoiceJob';
import { SalesInvoiceService } from '../services/salesInvoiceService';
import { SalesInvoicePdfService } from '../services/pdf/salesInvoicePdfService';

describe('SalesInvoiceJob overlap lock', () => {
  afterEach(() => jest.restoreAllMocks());

  it('überspringt einen zweiten Lauf, solange der erste noch läuft', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>(res => { releaseFirst = res; });

    const generateAll = jest.spyOn(SalesInvoiceService, 'generateAll')
      .mockImplementation(async () => {
        await firstGate; // erster Lauf „hängt", bis wir ihn freigeben
        return { created: 1, vendors: 1, errors: 0 };
      });
    const generatePending = jest.spyOn(SalesInvoicePdfService, 'generatePending')
      .mockResolvedValue({ generated: 1, failed: 0 });

    // Ersten Lauf starten (blockiert am Gate), zweiten währenddessen anstoßen.
    const firstRun = SalesInvoiceJob.run();
    const secondRun = SalesInvoiceJob.run(); // sollte sofort zurückkehren (Lock)

    await secondRun;
    // Zweiter Lauf hat generateAll NICHT ein zweites Mal aufgerufen.
    expect(generateAll).toHaveBeenCalledTimes(1);

    // Ersten Lauf abschließen lassen.
    releaseFirst();
    await firstRun;

    expect(generateAll).toHaveBeenCalledTimes(1);
    expect(generatePending).toHaveBeenCalledTimes(1);
  });

  it('gibt den Lock nach einem Fehler wieder frei', async () => {
    const generateAll = jest.spyOn(SalesInvoiceService, 'generateAll')
      .mockResolvedValue({ created: 0, vendors: 0, errors: 0 });
    generateAll.mockRejectedValueOnce(new Error('boom')); // nur der erste Aufruf schlägt fehl
    jest.spyOn(SalesInvoicePdfService, 'generatePending').mockResolvedValue({ generated: 0, failed: 0 });

    await SalesInvoiceJob.run(); // erster Lauf: Fehler wird geschluckt, Lock freigegeben
    await SalesInvoiceJob.run(); // zweiter Lauf: läuft normal → beweist Lock-Freigabe

    expect(generateAll).toHaveBeenCalledTimes(2);
  });
});

describe('SalesInvoiceJob.isBusy() für Graceful Shutdown (AUDIT OP14)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('ist während eines laufenden run() true, danach false', async () => {
    let release!: () => void;
    const gate = new Promise<void>(res => { release = res; });
    jest.spyOn(SalesInvoiceService, 'generateAll').mockImplementation(async () => {
      await gate;
      return { created: 0, vendors: 0, errors: 0 };
    });
    jest.spyOn(SalesInvoicePdfService, 'generatePending')
      .mockResolvedValue({ generated: 0, failed: 0 });

    expect(SalesInvoiceJob.isBusy()).toBe(false);
    const run = SalesInvoiceJob.run();
    expect(SalesInvoiceJob.isBusy()).toBe(true); // Shutdown würde jetzt warten

    release();
    await run;
    expect(SalesInvoiceJob.isBusy()).toBe(false); // Shutdown darf fortfahren
  });

  it('ist nach einem Fehler false', async () => {
    jest.spyOn(SalesInvoiceService, 'generateAll').mockRejectedValue(new Error('boom'));

    await SalesInvoiceJob.run();

    expect(SalesInvoiceJob.isBusy()).toBe(false);
  });
});
