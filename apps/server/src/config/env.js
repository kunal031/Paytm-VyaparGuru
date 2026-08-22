import dotenv from 'dotenv';

dotenv.config();

const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  mongodbUri: required('MONGODB_URI', 'mongodb://localhost:27017/vyaparguru'),
  useInMemoryDb: process.env.USE_IN_MEMORY_DB === 'true',
  seedOnBoot: process.env.SEED_ON_BOOT === 'true',
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (env.isProduction && env.jwtSecret === 'dev-only-change-me') {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}
