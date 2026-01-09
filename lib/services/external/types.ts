import type { 
  WhatsAppMessage, 
  WhatsAppWebhookPayload, 
  GeminiRequest, 
  GeminiResponse, 
  N8nWorkflowExecution 
} from '../../types/services/external';

export interface WhatsAppService {
  sendMessage(message: WhatsAppMessage): Promise<{ messageId: string }>;
  processWebhook(payload: WhatsAppWebhookPayload): Promise<void>;
  verifyWebhook(token: string, challenge: string): Promise<string>;
}

export interface GeminiService {
  generateResponse(request: GeminiRequest): Promise<GeminiResponse>;
  analyzeIntent(message: string): Promise<{ intent: string; confidence: number }>;
  generateLeadScore(contactData: Record<string, any>): Promise<number>;
}

export interface N8nService {
  executeWorkflow(execution: N8nWorkflowExecution): Promise<{ executionId: string }>;
  getWorkflowStatus(executionId: string): Promise<{ status: string; data?: any }>;
  triggerWebhook(webhookUrl: string, data: Record<string, any>): Promise<void>;
}

export type { 
  WhatsAppMessage, 
  WhatsAppWebhookPayload, 
  GeminiRequest, 
  GeminiResponse, 
  N8nWorkflowExecution 
};