import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });
}

const client = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;

const CONNECTION_RETRIES = 6;
const COLD_START_DELAYS_MS = [1000, 2000, 4000, 8000, 12000, 15000];

export async function prismaQuery<T>(fn: (p: typeof client) => Promise<T>, retries = CONNECTION_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(client);
    } catch (err: any) {
      const isConnectionError = err?.code === 'P1001' || err?.message?.includes('Can\'t reach database');
      if (isConnectionError && attempt < retries) {
        const delay = COLD_START_DELAYS_MS[Math.min(attempt, COLD_START_DELAYS_MS.length - 1)];
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

export const prisma = client;
export default client;
