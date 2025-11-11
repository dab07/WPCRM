import { MongoClient, ObjectId } from 'mongodb';

let client;
let db;

export async function connectDB() {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'wpcrm';

    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();
    db = client.db(dbName);

    console.log('✅ Connected to MongoDB');

    // Create indexes
    await createIndexes();

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

async function createIndexes() {
  try {
    // Contacts indexes
    await db.collection('contacts').createIndex({ phone_number: 1 }, { unique: true });
    await db.collection('contacts').createIndex({ tags: 1 });
    await db.collection('contacts').createIndex({ created_at: -1 });

    // Conversations indexes
    await db.collection('conversations').createIndex({ contact_id: 1 });
    await db.collection('conversations').createIndex({ assigned_agent_id: 1 });
    await db.collection('conversations').createIndex({ status: 1 });
    await db.collection('conversations').createIndex({ last_message_at: -1 });

    // Messages indexes
    await db.collection('messages').createIndex({ conversation_id: 1, created_at: -1 });
    await db.collection('messages').createIndex({ whatsapp_message_id: 1 }, { unique: true, sparse: true });

    // Triggers indexes
    await db.collection('triggers').createIndex({ type: 1, is_active: 1 });

    // Customer journey indexes
    await db.collection('customer_journey').createIndex({ contact_id: 1 }, { unique: true });
    await db.collection('customer_journey').createIndex({ stage: 1 });

    // Workflow executions indexes
    await db.collection('workflow_executions').createIndex({ contact_id: 1 });
    await db.collection('workflow_executions').createIndex({ status: 1 });
    await db.collection('workflow_executions').createIndex({ started_at: -1 });

    // Lead scoring indexes
    await db.collection('lead_scoring').createIndex({ contact_id: 1 }, { unique: true });
    await db.collection('lead_scoring').createIndex({ score: -1 });

    // Agents indexes
    await db.collection('agents').createIndex({ email: 1 }, { unique: true });

    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

// Helper function to convert string ID to ObjectId
export function toObjectId(id) {
  if (typeof id === 'string') {
    return new ObjectId(id);
  }
  return id;
}

// Helper function to safely convert ObjectId to string
export function toStringId(obj) {
  if (obj && obj._id) {
    return { ...obj, id: obj._id.toString(), _id: undefined };
  }
  return obj;
}

export { ObjectId };