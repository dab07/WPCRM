// Contact-related type definitions
export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags: string[];
  metadata: Record<string, any>;
  source: string;
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