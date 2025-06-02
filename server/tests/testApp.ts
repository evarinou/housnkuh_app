import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '../src/routes';

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
  
  return app;
}