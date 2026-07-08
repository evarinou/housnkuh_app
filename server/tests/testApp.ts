import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '../src/routes';
import { errorHandler } from '../src/middleware/security';

export function createTestApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cors());
  app.use(helmet());

  // API routes
  app.use('/api', routes);

  // Base route
  app.get('/', (req, res) => {
    res.json({ message: 'Test API' });
  });

  // Zentrale Fehlerbehandlung wie in src/index.ts ({ success: false, message })
  app.use(errorHandler);

  return app;
}