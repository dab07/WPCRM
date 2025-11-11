import express from 'express';
import { getDB, toObjectId, toStringId } from '../db/mongodb.js';

const router = express.Router();

// Get all contacts
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { search, tags, limit = 50, skip = 0 } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    const contacts = await db.collection('contacts')
      .find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();

    const total = await db.collection('contacts').countDocuments(query);

    res.json({
      contacts: contacts.map(toStringId),
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get single contact
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const contact = await db.collection('contacts').findOne({
      _id: toObjectId(req.params.id)
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get customer journey
    const journey = await db.collection('customer_journey').findOne({
      contact_id: contact._id
    });

    // Get lead score
    const leadScore = await db.collection('lead_scoring').findOne({
      contact_id: contact._id
    });

    res.json({
      ...toStringId(contact),
      journey: toStringId(journey),
      lead_score: toStringId(leadScore)
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Create contact
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { phone_number, name, email, company, tags, source = 'manual' } = req.body;

    if (!phone_number || !name) {
      return res.status(400).json({ error: 'Phone number and name are required' });
    }

    // Check if contact already exists
    const existing = await db.collection('contacts').findOne({ phone_number });
    if (existing) {
      return res.status(409).json({ error: 'Contact with this phone number already exists' });
    }

    const contact = {
      phone_number,
      name,
      email: email || null,
      company: company || null,
      tags: tags || [],
      source,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('contacts').insertOne(contact);

    // Initialize customer journey
    await db.collection('customer_journey').insertOne({
      contact_id: result.insertedId,
      stage: 'awareness',
      score: 0,
      touchpoints: [],
      engagement_level: 'low',
      last_interaction: new Date(),
      updated_at: new Date()
    });

    // Initialize lead scoring
    await db.collection('lead_scoring').insertOne({
      contact_id: result.insertedId,
      score: 0,
      factors: {
        engagement: 0,
        recency: 0,
        frequency: 0,
        intent: 0
      },
      confidence: 0,
      last_updated: new Date()
    });

    res.status(201).json({
      ...toStringId(contact),
      id: result.insertedId.toString()
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { name, email, company, tags } = req.body;

    const update = {
      $set: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(company !== undefined && { company }),
        ...(tags && { tags }),
        updated_at: new Date()
      }
    };

    const result = await db.collection('contacts').findOneAndUpdate(
      { _id: toObjectId(req.params.id) },
      update,
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(toStringId(result.value));
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const contactId = toObjectId(req.params.id);

    // Delete related data
    await Promise.all([
      db.collection('conversations').deleteMany({ contact_id: contactId }),
      db.collection('customer_journey').deleteOne({ contact_id: contactId }),
      db.collection('lead_scoring').deleteOne({ contact_id: contactId })
    ]);

    // Delete contact
    const result = await db.collection('contacts').deleteOne({ _id: contactId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;