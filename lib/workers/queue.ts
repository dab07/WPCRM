import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const opportunityQueue = new Queue('opportunity-queue', { connection });

export async function enqueueScan(type: string, data: any) {
  return await opportunityQueue.add(type, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}
