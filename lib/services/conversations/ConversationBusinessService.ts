import { ConversationsService } from './ConversationsService';
import { ContactsService } from '../contacts/ContactsService';
import { sendWhatsAppMessage } from '../external/WhatsAppService';
import type { Message } from '../../types/api/messages';

/**
 * Business logic service for conversation operations
 * Handles complex workflows involving conversations and messaging
 */
export class ConversationBusinessService {
  constructor(
    private conversationsService: ConversationsService,
    private contactsService: ContactsService
  ) {}

  /**
   * Sends a message in a conversation with full workflow
   * This encapsulates the business logic from the API route
   */
  async sendMessageInConversation(
    conversationId: string,
    message: string,
    agentId?: string
  ): Promise<{
    success: boolean;
    message: Message;
  }> {
    if (!conversationId || !message) {
      throw new Error('Missing required fields: conversationId and message');
    }

    // Get conversation with contact details
    const conversation = await this.conversationsService.getWithContact(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Send via WhatsApp
    const result = await sendWhatsAppMessage({
      to: conversation.contact.phone_number,
      message
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }

    // Save message to database
    const messageData: any = {
      conversation_id: conversationId,
      sender_type: 'agent',
      content: message,
      message_type: 'text',
      delivery_status: 'sent'
    };

    // Only add whatsapp_message_id if it exists
    if (result.messageId) {
      messageData.whatsapp_message_id = result.messageId;
    }

    const savedMessage = await this.conversationsService.addMessage(messageData);

    // Update conversation status
    await this.conversationsService.update(conversationId, {
      last_message_at: new Date().toISOString(),
      last_message_from: 'agent',
      status: 'agent_assigned',
      assigned_agent_id: agentId || conversation.assigned_agent_id
    });

    return {
      success: true,
      message: savedMessage
    };
  }

  /**
   * Creates a conversation with initial message
   */
  async createConversationWithMessage(
    contactId: string,
    initialMessage: string,
    channel: string = 'whatsapp'
  ): Promise<{
    conversation: any;
    message: Message;
  }> {
    // Create conversation
    const conversation = await this.conversationsService.create({
      contact_id: contactId,
      status: 'active',
      channel,
      last_message_at: new Date().toISOString(),
      last_message_from: 'customer'
    });

    // Add initial message
    const message = await this.conversationsService.addMessage({
      conversation_id: conversation.id,
      sender_type: 'customer',
      content: initialMessage,
      message_type: 'text',
      delivery_status: 'received'
    });

    return { conversation, message };
  }

  /**
   * Handles incoming message workflow
   */
  async handleIncomingMessage(
    phoneNumber: string,
    messageContent: string,
    whatsappMessageId?: string
  ): Promise<{
    conversation: any;
    message: Message;
    isNewContact: boolean;
  }> {
    // Find or create contact
    let contact = await this.contactsService.findByPhone(phoneNumber);
    let isNewContact = false;

    if (!contact) {
      contact = await this.contactsService.create({
        phone_number: phoneNumber,
        name: `Contact ${phoneNumber}`,
        source: 'whatsapp',
        tags: ['whatsapp']
      });
      isNewContact = true;
    }

    // Find or create conversation
    let conversation = await this.conversationsService.findActiveByContact(contact.id);
    
    if (!conversation) {
      conversation = await this.conversationsService.create({
        contact_id: contact.id,
        status: 'active',
        channel: 'whatsapp',
        last_message_at: new Date().toISOString(),
        last_message_from: 'customer'
      });
    }

    // Add message
    const messageData: any = {
      conversation_id: conversation.id,
      sender_type: 'customer',
      content: messageContent,
      message_type: 'text',
      delivery_status: 'received'
    };

    // Only add whatsapp_message_id if it exists
    if (whatsappMessageId) {
      messageData.whatsapp_message_id = whatsappMessageId;
    }

    const message = await this.conversationsService.addMessage(messageData);

    // Update conversation
    await this.conversationsService.update(conversation.id, {
      last_message_at: new Date().toISOString(),
      last_message_from: 'customer',
      status: 'active'
    });

    return { conversation, message, isNewContact };
  }
}