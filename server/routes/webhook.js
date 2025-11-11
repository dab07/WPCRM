import express from 'express';
import { getDB, toObjectId } from '../db/mongodb.js';
import { GeminiAI } from '../services/gemini.js';
import { TriggerEngine } from '../services/triggers.js';

const router = express.Router();
const geminiAI = new GeminiAI(process.env.GEMINI_API_KEY);
const triggerEngine = new TriggerEngine();

// WhatsApp webhook verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// WhatsApp webhook handler
router.post('/whatsapp', async (req, res) => {
  try {
    // Respond immediately to WhatsApp
    res.status(200).send('OK');

    const body = req.body;

    // Check if this is a message event
    if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return;
    }

    const message = body.entry[0].changes[0].value.messages[0];
    const phoneNumber = message.from;
    const messageText = message.text?.body || '';
    const messageType = message.type;

    console.log(`📱 Incoming message from ${phoneNumber}: ${messageText}`);

    const db = getDB();

    // Get or create contact
    let contact = await db.collection('contacts').findOne({ phone_number: phoneNumber });
    
    if (!contact) {
      const result = await db.collection('contacts').insertOne({
        phone_number: phoneNumber,
        name: phoneNumber,
        source: 'chat',
        tags: [],
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      });

      contact = await db.collection('contacts').findOne({ _id: result.insertedId });

      // Initialize customer journey
      await db.collection('customer_journey').insertOne({
        contact_id: contact._id,
        stage: 'awareness',
        score: 0,
        touchpoints: [],
        engagement_level: 'low',
        last_interaction: new Date(),
        updated_at: new Date()
      });
    }

    // Get or create conversation
    let conversation = await db.collection('conversations').findOne({
      contact_id: contact._id,
      status: { $in: ['active', 'ai_handled'] }
    });

    if (!conversation) {
      const result = await db.collection('conversations').insertOne({
        contact_id: contact._id,
        assigned_agent_id: null,
        status: 'active',
        last_message_at: new Date(),
        last_message_from: 'customer',
        context: {},
        created_at: new Date(),
        updated_at: new Date()
      });

      conversation = await db.collection('conversations').findOne({ _id: result.insertedId });
    }

    // Store incoming message
    await db.collection('messages').insertOne({
      conversation_id: conversation._id,
      sender_type: 'customer',
      content: messageText,
      message_type: messageType,
      whatsapp_message_id: message.id,
      delivery_status: 'delivered',
      created_at: new Date()
    });

    // Handle image messages (business cards)
    if (messageType === 'image') {
      console.log('📸 Image received - processing as business card');
      // TODO: Implement OCR processing
      return;
    }

    // Get conversation history for context
    const conversationHistory = await db.collection('messages')
      .find({ conversation_id: conversation._id })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    // Analyze message with Gemini AI
    console.log('🤖 Analyzing message with Gemini AI...');
    const analysis = await geminiAI.analyzeMessage(messageText, {
      customer: contact,
      conversation: conversation,
      history: conversationHistory
    });

    console.log('📊 Analysis:', analysis);

    // Store conversation analytics
    await db.collection('conversation_analytics').insertOne({
      conversation_id: conversation._id,
      sentiment_score: analysis.sentiment === 'positive' ? 0.8 : analysis.sentiment === 'negative' ? 0.2 : 0.5,
      intent_detected: [analysis.intent],
      topics_discussed: analysis.topics || [],
      insights: analysis,
      analyzed_at: new Date()
    });

    // Check and execute triggers
    console.log('⚡ Checking triggers...');
    const activatedTriggers = await triggerEngine.checkTriggers(analysis, contact, conversation);
    
    if (activatedTriggers.length > 0) {
      console.log(`✅ Activated ${activatedTriggers.length} triggers`);
      for (const trigger of activatedTriggers) {
        await triggerEngine.executeTrigger(trigger, contact, conversation);
      }
    }

    // Generate AI response if confidence is high enough
    if (analysis.confidence >= 0.7) {
      console.log('💬 Generating AI response...');
      const aiResponse = await geminiAI.generateResponse(analysis, contact, conversationHistory);

      // Store AI response
      await db.collection('messages').insertOne({
        conversation_id: conversation._id,
        sender_type: 'ai',
        content: aiResponse,
        message_type: 'text',
        delivery_status: 'sent',
        created_at: new Date()
      });

      // Update conversation
      await db.collection('conversations').updateOne(
        { _id: conversation._id },
        {
          $set: {
            status: 'ai_handled',
            ai_confidence_score: analysis.confidence,
            last_message_at: new Date(),
            last_message_from: 'ai',
            updated_at: new Date()
          }
        }
      );

      // TODO: Send message via WhatsApp API
      console.log('✅ AI response:', aiResponse);
    } else {
      // Hand over to human agent
      console.log('👤 Low confidence - handing over to human agent');
      await db.collection('conversations').updateOne(
        { _id: conversation._id },
        {
          $set: {
            status: 'agent_assigned',
            handover_reason: 'low_confidence',
            last_message_at: new Date(),
            updated_at: new Date()
          }
        }
      );
    }

    // Update customer journey
    await db.collection('customer_journey').updateOne(
      { contact_id: contact._id },
      {
        $set: {
          last_interaction: new Date(),
          updated_at: new Date()
        },
        $push: {
          touchpoints: {
            type: 'message',
            timestamp: new Date(),
            data: { intent: analysis.intent, sentiment: analysis.sentiment }
          }
        }
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
  }
});

export default router;