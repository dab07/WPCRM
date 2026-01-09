import { FollowUpRulesService } from './FollowUpRulesService';
import { ConversationsService } from '../conversations/ConversationsService';
import { sendWhatsAppMessage } from '../external/WhatsAppService';

/**
 * Business logic service for follow-up automation
 * Handles the complex workflow of checking and sending follow-up messages
 */
export class FollowUpBusinessService {
  private static lastExecutionTime = 0;
  private static readonly MIN_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

  constructor(
    private followUpRulesService: FollowUpRulesService,
    private conversationsService: ConversationsService
  ) {}

  /**
   * Executes follow-up message workflow with rate limiting
   */
  async executeFollowUpWorkflow(): Promise<{
    success: boolean;
    message: string;
    totalSent: number;
    totalChecked: number;
    rateLimited?: boolean;
    nextAllowedInMinutes?: number;
  }> {
    // Rate limiting check
    const now = Date.now();
    if (now - FollowUpBusinessService.lastExecutionTime < FollowUpBusinessService.MIN_INTERVAL_MS) {
      const waitTime = Math.ceil(
        (FollowUpBusinessService.MIN_INTERVAL_MS - (now - FollowUpBusinessService.lastExecutionTime)) / 1000 / 60
      );
      
      return {
        success: false,
        message: `Rate limited. Please wait ${waitTime} minutes.`,
        totalSent: 0,
        totalChecked: 0,
        rateLimited: true,
        nextAllowedInMinutes: waitTime
      };
    }

    FollowUpBusinessService.lastExecutionTime = now;

    try {
      // Get active follow-up rules
      const rules = await this.followUpRulesService.getActiveInactivityRules();
      
      if (!rules || rules.length === 0) {
        return {
          success: true,
          message: 'No active follow-up rules found',
          totalSent: 0,
          totalChecked: 0
        };
      }

      // Get conversations that need follow-up
      const conversations = await this.conversationsService.getConversationsNeedingFollowUp();
      
      if (!conversations || conversations.length === 0) {
        return {
          success: true,
          message: 'No conversations to check',
          totalSent: 0,
          totalChecked: 0
        };
      }

      let totalSent = 0;

      for (const conversation of conversations) {
        const result = await this.processConversationForFollowUp(conversation, rules);
        if (result.sent) {
          totalSent++;
        }
      }

      return {
        success: true,
        message: `Sent ${totalSent} follow-up messages`,
        totalSent,
        totalChecked: conversations.length
      };

    } catch (error) {
      throw new Error(`Follow-up workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a single conversation for follow-up
   */
  private async processConversationForFollowUp(
    conversation: any, 
    rules: any[]
  ): Promise<{ sent: boolean; ruleUsed?: string }> {
    // Calculate hours since last customer message
    const lastMessageTime = new Date(conversation.last_message_at);
    const hoursSinceLastMessage = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60);

    // Get sent follow-ups for this conversation
    const sentFollowUps = await this.conversationsService.getSentFollowUps(
      conversation.id, 
      conversation.last_message_at
    );
    
    const sentRuleIds = new Set(
      sentFollowUps.map(m => m.metadata?.follow_up_rule_id).filter(Boolean)
    );

    // Find applicable rule
    const applicableRule = this.findApplicableRule(rules, hoursSinceLastMessage, sentRuleIds);
    
    if (!applicableRule) {
      return { sent: false };
    }

    // Send follow-up message
    const message = this.formatFollowUpMessage(applicableRule, conversation.contact);
    
    const result = await sendWhatsAppMessage({
      to: conversation.contact.phone_number,
      message
    });

    if (result.success) {
      // Save message and update conversation
      const messageData: any = {
        conversation_id: conversation.id,
        sender_type: 'ai',
        content: message,
        message_type: 'text',
        delivery_status: 'sent',
        metadata: {
          follow_up_rule_id: applicableRule.id,
          follow_up_rule_name: applicableRule.name,
          hours_inactive: Math.round(hoursSinceLastMessage)
        }
      };

      // Only add whatsapp_message_id if it exists
      if (result.messageId) {
        messageData.whatsapp_message_id = result.messageId;
      }

      await this.conversationsService.addMessage(messageData);

      await this.conversationsService.update(conversation.id, {
        last_message_at: new Date().toISOString(),
        last_message_from: 'ai'
      });

      return { sent: true, ruleUsed: applicableRule.name };
    }

    return { sent: false };
  }

  /**
   * Find the appropriate follow-up rule for a conversation
   */
  private findApplicableRule(rules: any[], hoursSinceLastMessage: number, sentRuleIds: Set<string>): any | null {
    for (const rule of rules) {
      const requiredHours = rule.inactivity_hours || 72;
      
      if (hoursSinceLastMessage >= requiredHours && !sentRuleIds.has(rule.id)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Format follow-up message with template variables
   */
  private formatFollowUpMessage(rule: any, contact: any): string {
    return rule.message_template
      .replace(/\{\{name\}\}/g, contact.name || 'there')
      .replace(/\{\{company\}\}/g, contact.company || '');
  }
}