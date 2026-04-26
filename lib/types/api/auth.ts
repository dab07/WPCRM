// [NEW: multi-tenant-isolation] — added 2026-04-18

export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserBrand {
  id: string;
  user_id: string;
  brand_id: string;
  role: UserRole;
  created_at: string;
}

/** Resolved brand context attached to every authenticated request */
export interface BrandContext {
  userId: string;
  brandId: string;
  role: UserRole;
}
