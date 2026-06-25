import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { runLifecycleScan } from '../scanners/lifecycle';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const opportunityWorker = new Worker(
  'opportunity-queue',
  async (job: Job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'lifecycle-scan') {
      // Run phase 1: sync and scan
      const result = await runLifecycleScan();
      console.log(`Lifecycle scan completed. Found ${result.opportunities?.length || 0} opportunities.`);
      return result;
    }

    if (job.name === 'weather-scan') {
      const { runWeatherScan } = require('../scanners/micromoment');
      const result = await runWeatherScan();
      console.log(`Weather scan completed. Created ${result.opportunitiesCreated?.length || 0} opportunities.`);
      return result;
    }

    // Add other phases or job types here (e.g. generate-brief)
    
    throw new Error(`Unknown job type: ${job.name}`);
  },
  { connection: connection as any }
);

opportunityWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

opportunityWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
