import { ContactsService } from './ContactsService';

import { sendWelcomeMessage } from '../external/WhatsAppService';
import type { Contact, CreateContactRequest } from '../../types/api/contacts';

/**
 * Business logic service for contact operations
 * Handles complex workflows that involve multiple services
 */
export class ContactBusinessService {
  constructor(
    private contactsService: ContactsService
  ) {}

  /**
   * Creates a contact and sends welcome message
   * This encapsulates the business logic from the API route
   */
  async createContactWithWelcome(contactData: CreateContactRequest): Promise<{
    contact: Contact;
    messageId?: string | undefined;
    conversationId?: string | undefined;
    success: boolean;
    warning?: string | undefined;
    error?: string | undefined;
  }> {
    // Validate required fields
    if (!contactData.name || !contactData.phone_number) {
      throw new Error('Name and phone number are required');
    }

    // Add default tags
    const dataWithDefaults = {
      ...contactData,
      tags: contactData.tags ? [...contactData.tags, 'broadcast'] : ['broadcast'],
      source: contactData.source || 'manual'
    };

    // Create contact
    const contact = await this.contactsService.create(dataWithDefaults);

    // Send welcome message
    const messageResult = await sendWelcomeMessage(
      contact.phone_number, 
      contact.name
    );

    if (messageResult.success) {
      return {
        contact,
        messageId: messageResult.messageId,
        success: true
      };
    } else {
      return {
        contact,
        success: true,
        warning: 'Contact created but welcome message failed',
        error: messageResult.error
      };
    }
  }
}