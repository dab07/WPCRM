import dotenv from 'dotenv';
import { connectDB, getDB, closeDB } from './server/db/mongodb.js';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...\n');

  try {
    // Test connection
    await connectDB();
    const db = getDB();

    console.log('✅ Successfully connected to MongoDB!\n');

    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📦 Available collections:');
    if (collections.length === 0) {
      console.log('   (No collections yet - they will be created automatically)');
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }

    console.log('\n📊 Database stats:');
    const stats = await db.stats();
    console.log(`   Database: ${stats.db}`);
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);

    // Test inserting a sample contact
    console.log('\n🧪 Testing insert operation...');
    const testContact = {
      name: 'Test Contact',
      phone_number: '+1234567890',
      email: 'test@example.com',
      tags: ['test'],
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await db.collection('contacts').insertOne(testContact);
    console.log(`✅ Test contact inserted with ID: ${result.insertedId}`);

    // Clean up test data
    await db.collection('contacts').deleteOne({ _id: result.insertedId });
    console.log('🧹 Test data cleaned up');

    console.log('\n✨ All tests passed! MongoDB is ready to use.');

  } catch (error) {
    console.error('\n❌ MongoDB connection failed:');
    console.error(error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Your .env file has MONGODB_URI and MONGODB_DB_NAME');
    console.error('   2. Your MongoDB Atlas cluster is running');
    console.error('   3. Your IP address is whitelisted in MongoDB Atlas');
    console.error('   4. Your credentials are correct');
  } finally {
    await closeDB();
    console.log('\n👋 Connection closed');
  }
}

testConnection();
