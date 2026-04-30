// Contact-related type definitions
// [UPDATED: unify-contacts-customers] — added 2026-04-18
// contacts is the single table for both WhatsApp CRM contacts and brand-synced customers.
export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags: string[];
  metadata: Record<string, any>;
  source: string;
  // Brand-sync fields (null for legacy WhatsApp CRM contacts)
  brand_id?: string;
  external_id?: string;
  first_name?: string;
  last_name?: string;
  orders_count?: number;
  total_spent?: number;
  accepts_marketing?: boolean;
  external_created_at?: string;
  external_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactRequest {
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  source: string;
}

export interface UpdateContactRequest {
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}