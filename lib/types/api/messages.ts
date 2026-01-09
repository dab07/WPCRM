// Message-related type definitions
export interface Message {
  id: string;
  conversation_id: string;
  whatsapp_message_id?: string;
  content: string;
  sender_type: 'user' | 'ai' | 'agent' | 'customer';
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document';
  delivery_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageRequest {
  conversation_id: string;
  whatsapp_message_id?: string;
  content: string;
  sender_type: 'user' | 'ai' | 'agent' | 'customer';
  message_type?: 'text' | 'image' | 'audio' | 'video' | 'document';
  delivery_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  metadata?: Record<string, any>;
}

export interface UpdateMessageRequest {
  content?: string;
  delivery_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  metadata?: Record<string, any>;
}