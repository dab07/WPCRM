import type { Contact, CreateContactRequest, UpdateContactRequest } from '../../types/api/contacts';
import type { BaseService } from '../../types/services/base';

export interface ContactsService extends BaseService<Contact> {
  findByPhone(phone: string): Promise<Contact | null>;
  addTags(id: string, tags: string[]): Promise<Contact>;
  removeTags(id: string, tags: string[]): Promise<Contact>;
  findByTags(tags: string[]): Promise<Contact[]>;
}

export type { Contact, CreateContactRequest, UpdateContactRequest };