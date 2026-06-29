import { getGallaboxService } from './lib/services/external/GallaboxService';

/**
 * Test script to send a single WhatsApp message via Gallabox.
 * 
 * Usage:
 * 1. Replace the 'to' phone number with your actual test number (include country code, e.g. "919876543210")
 * 2. Run the script: npx tsx --env-file=.env.local test-gallabox.ts
 */
async function main() {
  try {
    console.log("Initializing Gallabox service...");
    const service = await getGallaboxService();

    console.log("Service initialized. Sending message...");
    const result = await service.sendMessage({
      to: '919982490069', // e.g., '919876543210'
      type: 'text',
      text: 'Hello! This is a test message from the WPCRM testing script.'
    });

    if (result.success) {
      console.log("✅ Message sent successfully! Message ID:", result.messageId);
    } else {
      console.error("❌ Failed to send message:", result.error);
    }
  } catch (err) {
    console.error("Error running test:", err);
  }
}

main();
