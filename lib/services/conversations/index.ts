// Conversations service exports
export { ConversationsService } from './ConversationsService';
export { ConversationBusinessService } from './ConversationBusinessService';
export type { 
  Conversation, 
  CreateConversationRequest, 
  UpdateConversationRequest 
} from '../../types/api/conversations';
export type { 
  Message, 
  CreateMessageRequest, 
  UpdateMessageRequest 
} from '../../types/api/messages';