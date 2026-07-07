/**
 * @file RateLimitHandler.network.test.ts
 * @purpose Sichert den erweiterten Retry (Audit OP4): transiente Netzwerkfehler
 *          werden wiederholt, echte Client-Fehler (4xx) nicht.
 */

import { RateLimitHandler } from './RateLimitHandler';

const fastConfig = { maxRetries: 3, initialDelay: 1, maxDelay: 3, backoffFactor: 2 };

describe('RateLimitHandler – Netzwerkfehler-Retry (OP4)', () => {
  it('wiederholt bei ECONNREFUSED und liefert danach das Ergebnis', async () => {
    const handler = new RateLimitHandler(fastConfig);
    let calls = 0;
    const request = jest.fn(async () => {
      calls++;
      if (calls === 1) {
        const err: any = new Error('connect ECONNREFUSED');
        err.code = 'ECONNREFUSED';
        throw err;
      }
      return 'ok';
    });

    const result = await handler.executeWithRetry(request);
    expect(result).toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('wiederholt bei Timeout (ETIMEDOUT)', async () => {
    const handler = new RateLimitHandler(fastConfig);
    let calls = 0;
    const request = jest.fn(async () => {
      calls++;
      if (calls <= 2) {
        const err: any = new Error('timeout of 30000ms exceeded');
        err.code = 'ETIMEDOUT';
        throw err;
      }
      return 42;
    });

    const result = await handler.executeWithRetry(request);
    expect(result).toBe(42);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('wiederholt NICHT bei einem 4xx-Serverfehler', async () => {
    const handler = new RateLimitHandler(fastConfig);
    const request = jest.fn(async () => {
      const err: any = new Error('Bad Request');
      err.response = { status: 400 };
      throw err;
    });

    await expect(handler.executeWithRetry(request)).rejects.toThrow('Bad Request');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('gibt nach erschöpften Retries den Netzwerkfehler weiter', async () => {
    const handler = new RateLimitHandler(fastConfig);
    const request = jest.fn(async () => {
      const err: any = new Error('ENOTFOUND flour.host');
      err.code = 'ENOTFOUND';
      throw err;
    });

    await expect(handler.executeWithRetry(request)).rejects.toThrow('ENOTFOUND');
    // 1 initialer Versuch + 3 Retries
    expect(request).toHaveBeenCalledTimes(4);
  });
});
