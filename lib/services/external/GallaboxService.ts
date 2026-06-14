/**
 * GallaboxService — WhatsApp Business API via Gallabox
 *
 * All Gallabox REST endpoints follow this pattern:
 *   https://server.gallabox.com/devapi/accounts/{accountId}/{resource}
 *
 * Auth headers: apikey + apisecret
 */

export interface GallaboxConfig {
  apiKey: string;
  apiSecret: string;
  /** Required — Gallabox account ID (from Settings page) */
  accountId: string;
}

export interface GallaboxSendMessageParams {
  /** Recipient phone number with country code, e.g. "919876543210" */
  to: string;
  /** Gallabox channel ID (WhatsApp channel, from Settings > WhatsApp Channel) */
  channelId?: string | undefined;
  type: 'text' | 'template' | 'image';
  text?: string | undefined;
  template?: GallaboxTemplateParams | undefined;
  image?: GallaboxImageParams | undefined;
}

export interface GallaboxTemplateParams {
  name: string;
  language?: string | undefined;
  bodyVariables?: string[] | undefined;
  headerVariables?: string[] | undefined;
}

export interface GallaboxImageParams {
  url: string;
  caption?: string | undefined;
}

export interface GallaboxSendResult {
  success: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
}

export interface GallaboxContact {
  id: string;
  name?: string | undefined;
  phone: string;
  email?: string | undefined;
  company?: string | undefined;
  tags?: string[] | undefined;
  customFields?: Record<string, string> | undefined;
}

export interface GallaboxCreateContactParams {
  name: string;
  phone: string;
  email?: string | undefined;
  company?: string | undefined;
  designation?: string | undefined;
  website?: string | undefined;
  tags?: string[] | undefined;
  customFields?: Record<string, string> | undefined;
}

export interface GallaboxContactsResult {
  success: boolean;
  contacts: GallaboxContact[];
  total?: number | undefined;
  error?: string | undefined;
}

export interface GallaboxTestResult {
  success: boolean;
  accountInfo?: {
    id?: string | undefined;
    name?: string | undefined;
  } | undefined;
  error?: string | undefined;
}

export class GallaboxServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number | undefined,
    public readonly originalError?: Error | undefined
  ) {
    super(message);
    this.name = 'GallaboxServiceError';
  }
}

export class GallaboxService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly accountId: string;
  private readonly baseUrl = 'https://server.gallabox.com/devapi';
  private readonly retries = 3;
  private readonly timeout = 30_000;

  constructor(config: GallaboxConfig) {
    this.apiKey    = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.accountId = config.accountId;
  }
  // ── Private helpers ───────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      'apiKey':         this.apiKey,
      'apiSecret':      this.apiSecret,
      'Content-Type':   'application/json',
    };
  }

  /** Builds a scoped path: /accounts/{accountId}/{resource} */
  private path(resource: string): string {
    return `/accounts/${this.accountId}/${resource}`;
  }

  private async fetchWithRetry<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const res = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
              ...this.headers,
              ...(options.headers as Record<string, string> ?? {}),
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new GallaboxServiceError(
              `Gallabox API error ${res.status}: ${body}`,
              res.status
            );
          }

          return (await res.json()) as T;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, 1_000 * Math.pow(2, attempt)));
        }
      }
    }

    throw new GallaboxServiceError(
      `Gallabox request failed after ${this.retries + 1} attempts: ${lastError?.message}`,
      undefined,
      lastError ?? undefined
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Test the connection.
   * Calls GET /accounts/{accountId}/users — the official Gallabox test endpoint.
   * No webhook setup required.
   */
  async testConnection(): Promise<GallaboxTestResult> {
    if (!this.accountId) {
      return { success: false, error: 'Account ID is required for Gallabox API calls.' };
    }

    try {
      const data = await this.fetchWithRetry<any>(this.path('users'));

      const users: any[] = Array.isArray(data) ? data : (data?.data ?? []);
      const firstName = users[0]?.name ?? users[0]?.firstName ?? null;

      return {
        success: true,
        accountInfo: {
          id:   this.accountId,
          name: firstName
            ? `Connected \u2014 ${firstName}${users.length > 1 ? ` +${users.length - 1} more` : ''}`
            : `Connected (${users.length} user${users.length !== 1 ? 's' : ''})`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Send a WhatsApp message via Gallabox.
   * Docs: POST /accounts/{accountId}/messages
   */
  async sendMessage(params: GallaboxSendMessageParams): Promise<GallaboxSendResult> {
    if (!this.accountId) {
      return { success: false, error: 'Account ID is required' };
    }

    try {
      const phone = params.to.replace(/^\+/, '').replace(/\D/g, '');

      const payload: Record<string, any> = {
        channelId:   params.channelId ?? '',
        channelType: 'whatsapp',
        recipient:   { phone },
      };

      if (params.type === 'text' && params.text) {
        payload.whatsapp = {
          type: 'text',
          text: { body: params.text },
        };
      } else if (params.type === 'template' && params.template) {
        const components: any[] = [];

        if (params.template.headerVariables?.length) {
          components.push({
            type: 'header',
            parameters: params.template.headerVariables.map(v => ({ type: 'text', text: v })),
          });
        }
        if (params.template.bodyVariables?.length) {
          components.push({
            type: 'body',
            parameters: params.template.bodyVariables.map(v => ({ type: 'text', text: v })),
          });
        }

        payload.whatsapp = {
          type: 'template',
          template: {
            name:       params.template.name,
            language:   { code: params.template.language ?? 'en' },
            components: components.length ? components : undefined,
          },
        };
      } else if (params.type === 'image' && params.image) {
        payload.whatsapp = {
          type: 'image',
          image: {
            link:    params.image.url,
            caption: params.image.caption,
          },
        };
      } else {
        return { success: false, error: 'Invalid params: provide text, template, or image' };
      }

      const result = await this.fetchWithRetry<any>(this.path('messages'), {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const messageId: string | undefined =
        result?.id ?? result?.data?.id ?? result?.messageId;

      return { success: true, messageId };
    } catch (error) {
      console.error('[Gallabox] sendMessage error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch contacts from Gallabox.
   * Docs: GET /accounts/{accountId}/contacts
   */
  async getContacts(limit = 500, offset = 0): Promise<GallaboxContactsResult> {
    if (!this.accountId) {
      return { success: false, contacts: [], error: 'Account ID is required' };
    }

    try {
      const data = await this.fetchWithRetry<any>(
        this.path(`contacts?limit=${limit}&skip=${offset}`)
      );

      const raw: any[] = Array.isArray(data) ? data : (data?.data ?? data?.contacts ?? []);
      const contacts: GallaboxContact[] = raw.map(c => ({
        id:    c._id ?? c.id ?? '',
        name:  c.name ?? '',
        phone: Array.isArray(c.phone) ? (c.phone[0] ?? '') : (c.phone ?? ''),
        email: Array.isArray(c.email) ? (c.email[0] ?? undefined) : (c.email ?? undefined),
        tags:  c.tags?.map((t: any) => (typeof t === 'string' ? t : t.name)) ?? [],
      }));

      return { success: true, contacts, total: data?.total ?? contacts.length };
    } catch (error) {
      console.error('[Gallabox] getContacts error:', error);
      return {
        success: false,
        contacts: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find a contact by phone number.
   * Docs: GET /accounts/{accountId}/contacts?phone={phone}
   */
  async findContactByPhone(phone: string): Promise<GallaboxContact | null> {
    if (!this.accountId) return null;

    try {
      const normalised = phone.replace(/^\+/, '').replace(/\D/g, '');
      const data = await this.fetchWithRetry<any>(
        this.path(`contacts?phone=${encodeURIComponent(normalised)}&limit=1`)
      );
      const raw: any[] = Array.isArray(data) ? data : (data?.data ?? data?.contacts ?? []);
      if (!raw.length) return null;

      const c = raw[0];
      return {
        id:    c._id ?? c.id ?? '',
        name:  c.name ?? '',
        phone: Array.isArray(c.phone) ? (c.phone[0] ?? normalised) : (c.phone ?? normalised),
        email: Array.isArray(c.email) ? (c.email[0] ?? undefined) : (c.email ?? undefined),
        tags:  c.tags?.map((t: any) => (typeof t === 'string' ? t : t.name)) ?? [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a new contact in Gallabox.
   * Docs: POST /accounts/{accountId}/contacts
   */
  async createContact(params: GallaboxCreateContactParams): Promise<{
    success: boolean;
    contactId?: string | undefined;
    error?: string | undefined;
  }> {
    if (!this.accountId) {
      return { success: false, error: 'Account ID is required' };
    }

    try {
      const phone = params.phone.replace(/^\+/, '').replace(/\D/g, '');

      // Gallabox contacts API expects phone as array
      const payload: Record<string, any> = {
        name:  params.name,
        phone: [phone],
      };

      if (params.email)       payload.email = [params.email];
      if (params.company)     payload.company = params.company;
      if (params.designation) payload.designation = params.designation;
      if (params.website)     payload.website = params.website;
      if (params.tags?.length) payload.tags = params.tags;

      const result = await this.fetchWithRetry<any>(this.path('contacts'), {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const contactId: string | undefined =
        result?._id ?? result?.id ?? result?.data?._id ?? result?.data?.id;

      return { success: true, contactId };
    } catch (error) {
      console.error('[Gallabox] createContact error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing contact.
   * Docs: PUT /accounts/{accountId}/contacts/{contactId}
   */
  async updateContact(
    contactId: string,
    updates: Partial<GallaboxCreateContactParams>
  ): Promise<{ success: boolean; error?: string | undefined }> {
    if (!this.accountId) return { success: false, error: 'Account ID is required' };

    try {
      const payload: Record<string, any> = {};
      if (updates.name)        payload.name = updates.name;
      if (updates.email)       payload.email = [updates.email];
      if (updates.company)     payload.company = updates.company;
      if (updates.designation) payload.designation = updates.designation;
      if (updates.website)     payload.website = updates.website;
      if (updates.tags?.length) payload.tags = updates.tags;

      await this.fetchWithRetry(this.path(`contacts/${contactId}`), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upsert: find by phone → update if exists, create if not.
   */
  async upsertContact(params: GallaboxCreateContactParams): Promise<{
    success: boolean;
    contactId?: string | undefined;
    action: 'created' | 'updated' | 'error';
    error?: string | undefined;
  }> {
    try {
      const existing = await this.findContactByPhone(params.phone);

      if (existing) {
        const res = await this.updateContact(existing.id, params);
        if (res.success) return { success: true, contactId: existing.id, action: 'updated' };
        return { success: false, action: 'error', error: res.error ?? undefined };
      }

      const res = await this.createContact(params);
      if (res.success) return { success: true, contactId: res.contactId ?? undefined, action: 'created' };
      return { success: false, action: 'error', error: res.error ?? undefined };
    } catch (error) {
      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ── Factory & Singleton ───────────────────────────────────────────────────────

export function createGallaboxService(overrides?: Partial<GallaboxConfig>): GallaboxService {
  const apiKey    = overrides?.apiKey    ?? process.env.GALLABOX_API_KEY    ?? '';
  const apiSecret = overrides?.apiSecret ?? process.env.GALLABOX_SECRET_API ?? '';
  const accountId = overrides?.accountId ?? process.env.GALLABOX_ACCOUNT_ID ?? '';
  return new GallaboxService({ apiKey, apiSecret, accountId });
}

let _instance: GallaboxService | null = null;

/**
 * Returns a GallaboxService instance whose credentials are sourced from
 * `platform_credentials` (the encrypted store). Falls back to env vars if no
 * DB row exists, so the service keeps working without database setup.
 *
 * This is async because it may need to decrypt credentials from Supabase.
 */
export async function getGallaboxService(): Promise<GallaboxService> {
  if (_instance) return _instance;

  const { supabaseAdmin } = await import('../../../supabase/supabase');
  const { decryptCredential } = await import('../../credentials/crypto');

  const { data, error } = await supabaseAdmin
    .from('platform_credentials')
    .select('encrypted_payload, encrypted_dek, iv')
    .eq('platform_name', 'gallabox')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new GallaboxServiceError(`Failed to load Gallabox credentials: ${error.message}`);
  }

  if (!data) {
    throw new GallaboxServiceError(
      'Gallabox credentials not configured. Add them in Settings → Platform Credentials.'
    );
  }

  const plaintext = await decryptCredential({
    encryptedPayload: data.encrypted_payload as string,
    encryptedDek:     data.encrypted_dek as string,
    iv:               data.iv as string,
  });

  _instance = new GallaboxService({
    apiKey:    plaintext['apiKey']    ?? '',
    apiSecret: plaintext['apiSecret'] ?? '',
    accountId: plaintext['accountId'] ?? '',
  });

  return _instance;
}

/** Call after updating credentials at runtime so the next call re-fetches from DB. */
export function resetGallaboxService(): void {
  _instance = null;
}
