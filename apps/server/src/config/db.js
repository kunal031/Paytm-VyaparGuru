import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer = null;

/**
 * Connects to MongoDB. When USE_IN_MEMORY_DB=true, spins up an ephemeral
 * mongodb-memory-server instance so the stack runs without Docker/local Mongo.
 */
export async function connectDb() {
  let uri = env.mongodbUri;

  if (env.useInMemoryDb) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      // Generous launch timeout — first boot on Windows can be slow (AV scans)
      instance: { dbName: 'vyaparguru', launchTimeout: 120_000 },
    });
    uri = `${memoryServer.getUri()}vyaparguru`;
    logger.warn({ uri }, 'Using in-memory MongoDB — data will not persist');
  }

  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info({ host: mongoose.connection.host, db: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
