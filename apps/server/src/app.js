import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { ok } from './utils/apiResponse.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import cashflowRoutes from './routes/cashflow.routes.js';
import salesRoutes from './routes/sales.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  // CLIENT_URL supports a comma-separated list for multi-origin deploys
  const origins = env.clientUrl.split(',').map((o) => o.trim());
  app.use(cors({ origin: origins.length === 1 ? origins[0] : origins, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(pinoHttp({ logger, autoLogging: env.isProduction }));

  app.get('/health', (_req, res) => ok(res, { status: 'ok', service: 'vyaparguru-server' }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/cashflow', cashflowRoutes);
  app.use('/api/v1/sales', salesRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
