import { useState, useEffect } from 'react';
import { serviceRegistry } from '../services';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '../types/api/contacts';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadContacts = async () => {
    try {
      setError(null);
      const data = await serviceRegistry.contacts.list();
      setContacts(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const createContact = async (contactData: CreateContactRequest) => {
    try {
      await serviceRegistry.contacts.create(contactData);
      await loadContacts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateContact = async (id: string, updates: UpdateContactRequest) => {
    try {
      await serviceRegistry.contacts.update(id, updates);
      await loadContacts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await serviceRegistry.contacts.delete(id);
      await loadContacts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const findContactByPhone = async (phone: string) => {
    try {
      return await serviceRegistry.contacts.findByPhone(phone);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const addTagsToContact = async (id: string, tags: string[]) => {
    try {
      await serviceRegistry.contacts.addTags(id, tags);
      await loadContacts();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { 
    contacts, 
    loading, 
    error, 
    createContact, 
    updateContact, 
    deleteContact, 
    findContactByPhone,
    addTagsToContact,
    reload: loadContacts 
  };
}