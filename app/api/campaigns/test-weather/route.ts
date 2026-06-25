import { NextResponse } from 'next/server';
import { runWeatherScan } from '@/lib/scanners/micromoment';

export async function POST() {
  try {
    // Run the weather scan synchronously for testing (bypassing BullMQ/Redis)
    console.log('[Test Weather API] Starting synchronous scan...');
    const result = await runWeatherScan();

    return NextResponse.json({
      success: true,
      message: 'Weather scan completed synchronously',
      result
    }, { status: 200 });

  } catch (error) {
    console.error('[Test Weather API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run weather task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
