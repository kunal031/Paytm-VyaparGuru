import axios from 'axios';
import { env } from '../config/env.js';

/** HTTP client for the Python FastAPI ML microservice. */
export const mlClient = axios.create({
  baseURL: env.mlServiceUrl,
  timeout: 30_000,
});

export async function mlHealthCheck() {
  const { data } = await mlClient.get('/health');
  return data;
}
