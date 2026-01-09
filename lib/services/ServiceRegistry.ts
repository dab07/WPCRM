import { ContactsService } from './contacts/ContactsService';
import { ContactBusinessService } from './contacts/ContactBusinessService';
import { ConversationsService } from './conversations/ConversationsService';
import { ConversationBusinessService } from './conversations/ConversationBusinessService';
import { CampaignsService } from './campaigns/CampaignsService';
import { TriggersService } from './triggers/TriggersService';
import { WorkflowExecutionsService } from './workflows/WorkflowExecutionsService';
import { FollowUpRulesService } from './automation/FollowUpRulesService';
import { FollowUpBusinessService } from './automation/FollowUpBusinessService';

/**
 * Service Registry - Provides singleton instances of all services
 * This ensures consistent service instances across the application
 */
class ServiceRegistry {
  private static instance: ServiceRegistry;
  
  private _contactsService?: ContactsService;
  private _contactBusinessService?: ContactBusinessService;
  private _conversationsService?: ConversationsService;
  private _conversationBusinessService?: ConversationBusinessService;
  private _campaignsService?: CampaignsService;
  private _triggersService?: TriggersService;
  private _workflowExecutionsService?: WorkflowExecutionsService;
  private _followUpRulesService?: FollowUpRulesService;
  private _followUpBusinessService?: FollowUpBusinessService;

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  get contacts(): ContactsService {
    if (!this._contactsService) {
      this._contactsService = new ContactsService();
    }
    return this._contactsService;
  }

  get contactBusiness(): ContactBusinessService {
    if (!this._contactBusinessService) {
      this._contactBusinessService = new ContactBusinessService(
        this.contacts,
        this.conversations
      );
    }
    return this._contactBusinessService;
  }

  get conversations(): ConversationsService {
    if (!this._conversationsService) {
      this._conversationsService = new ConversationsService();
    }
    return this._conversationsService;
  }

  get conversationBusiness(): ConversationBusinessService {
    if (!this._conversationBusinessService) {
      this._conversationBusinessService = new ConversationBusinessService(
        this.conversations,
        this.contacts
      );
    }
    return this._conversationBusinessService;
  }

  get campaigns(): CampaignsService {
    if (!this._campaignsService) {
      this._campaignsService = new CampaignsService();
    }
    return this._campaignsService;
  }

  get triggers(): TriggersService {
    if (!this._triggersService) {
      this._triggersService = new TriggersService();
    }
    return this._triggersService;
  }

  get workflowExecutions(): WorkflowExecutionsService {
    if (!this._workflowExecutionsService) {
      this._workflowExecutionsService = new WorkflowExecutionsService();
    }
    return this._workflowExecutionsService;
  }

  get followUpRules(): FollowUpRulesService {
    if (!this._followUpRulesService) {
      this._followUpRulesService = new FollowUpRulesService();
    }
    return this._followUpRulesService;
  }

  get followUpBusiness(): FollowUpBusinessService {
    if (!this._followUpBusinessService) {
      this._followUpBusinessService = new FollowUpBusinessService(
        this.followUpRules,
        this.conversations
      );
    }
    return this._followUpBusinessService;
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Export individual services for direct import if needed
export {
  ContactsService,
  ContactBusinessService,
  ConversationsService,
  ConversationBusinessService,
  CampaignsService,
  TriggersService,
  WorkflowExecutionsService,
  FollowUpRulesService,
  FollowUpBusinessService
};