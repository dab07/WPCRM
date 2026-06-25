import { NextResponse } from 'next/server';
import { enqueueScan } from '@/lib/workers/queue';

export async function POST() {
  try {
    // Instead of doing synchronous work, enqueue a job for the background worker
    const job = await enqueueScan('lifecycle-scan', {
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Lifecycle scan queued successfully',
      jobId: job.id
    }, { status: 202 });

  } catch (error) {
    console.error('[Generate Journey Strategy API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to enqueue journey strategy task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
