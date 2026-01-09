import type { Conversation, CreateConversationRequest, UpdateConversationRequest } from '../../types/api/conversations';
import type { BaseService } from '../../types/services/base';

export interface ConversationsService extends BaseService<Conversation> {
  findByContactId(contactId: string): Promise<Conversation[]>;
  findByStatus(status: Conversation['status']): Promise<Conversation[]>;
  updateStatus(id: string, status: Conversation['status']): Promise<Conversation>;
  updateAIConfidence(id: string, confidence: number): Promise<Conversation>;
}

export type { Conversation, CreateConversationRequest, UpdateConversationRequest };