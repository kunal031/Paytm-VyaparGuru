import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDb();

  // In-memory DB always seeds (data is ephemeral). With SEED_ON_BOOT on a real
  // DB, seed only when empty so restarts don't wipe live data.
  if (env.seedOnBoot || env.useInMemoryDb) {
    const { seedFromSimulatorOutput, DEMO_PASSWORD } = await import('./scripts/seed.js');
    const { Merchant } = await import('./models/Merchant.js');
    const existing = await Merchant.estimatedDocumentCount();
    if (existing === 0 || env.useInMemoryDb) {
      const summary = await seedFromSimulatorOutput();
      logger.info({ merchants: summary.map((s) => s.email) }, `Seeded demo data (password: ${DEMO_PASSWORD})`);
    } else {
      logger.info({ merchants: existing }, 'SEED_ON_BOOT set but DB already has data — skipping seed');
    }
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`VyaparGuru server listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
