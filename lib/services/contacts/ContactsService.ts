import { AbstractBaseService } from '../base/BaseService';
import { getSupabaseClient } from '../../../supabase/supabase';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '../../types/api/contacts';
import type { QueryOptions } from '../../types/services/base';

export class ContactsService extends AbstractBaseService<Contact> {
  protected tableName = 'contacts';
  private supabase = getSupabaseClient();

  async list(options?: QueryOptions): Promise<Contact[]> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      // Apply filters if provided
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply sorting
      if (options?.sortBy) {
        query = query.order(options.sortBy, { 
          ascending: options.sortOrder === 'asc' 
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options?.page && options?.pageSize) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to fetch contacts: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async get(id: string): Promise<Contact> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Contact with id ${id} not found`);
        }
        throw this.createError('FETCH_ERROR', `Failed to fetch contact: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async create(data: CreateContactRequest): Promise<Contact> {
    try {
      const { data: contact, error } = await this.supabase
        .from(this.tableName)
        .insert({
          ...data,
          tags: data.tags || [],
          metadata: data.metadata || {}
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw this.createError('DUPLICATE_ERROR', 'Contact with this phone number already exists');
        }
        throw this.createError('CREATE_ERROR', `Failed to create contact: ${error.message}`, error);
      }

      return contact;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(id: string, data: UpdateContactRequest): Promise<Contact> {
    try {
      const { data: contact, error } = await this.supabase
        .from(this.tableName)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', `Contact with id ${id} not found`);
        }
        throw this.createError('UPDATE_ERROR', `Failed to update contact: ${error.message}`, error);
      }

      return contact;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.createError('DELETE_ERROR', `Failed to delete contact: ${error.message}`, error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Domain-specific methods
  async findByPhone(phone: string): Promise<Contact | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle();

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to find contact by phone: ${error.message}`, error);
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addTags(id: string, tags: string[]): Promise<Contact> {
    try {
      // First get the current contact to merge tags
      const contact = await this.get(id);
      const currentTags = contact.tags || [];
      const newTags = [...new Set([...currentTags, ...tags])]; // Remove duplicates

      return await this.update(id, { tags: newTags });
    } catch (error) {
      this.handleError(error);
    }
  }

  async removeTags(id: string, tags: string[]): Promise<Contact> {
    try {
      const contact = await this.get(id);
      const currentTags = contact.tags || [];
      const newTags = currentTags.filter(tag => !tags.includes(tag));

      return await this.update(id, { tags: newTags });
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByTags(tags: string[]): Promise<Contact[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .overlaps('tags', tags);

      if (error) {
        throw this.createError('FETCH_ERROR', `Failed to find contacts by tags: ${error.message}`, error);
      }

      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }
}