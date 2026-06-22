import { ContactsService } from './contacts/ContactsService';
import { ContactBusinessService } from './contacts/ContactBusinessService';
import { CampaignsService } from './campaigns/CampaignsService';

/**
 * Service Registry - Provides singleton instances of all services
 * This ensures consistent service instances across the application
 */
class ServiceRegistry {
  private static instance: ServiceRegistry;
  
  private _contactsService?: ContactsService;
  private _contactBusinessService?: ContactBusinessService;
  private _campaignsService?: CampaignsService;

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
        this.contacts
      );
    }
    return this._contactBusinessService;
  }



  get campaigns(): CampaignsService {
    if (!this._campaignsService) {
      this._campaignsService = new CampaignsService();
    }
    return this._campaignsService;
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Export individual services for direct import if needed
export {
  ContactsService,
  ContactBusinessService,
  CampaignsService
};