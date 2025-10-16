/**
 * @file jest.setup.ts
 * @purpose Jest setup - loads .env.local for integration tests
 * @created 2025-10-16
 */

import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '.env.local');
config({ path: envPath });

console.log('Jest setup: Loaded .env.local for integration tests');
