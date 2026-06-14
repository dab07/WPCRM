/**
 * GallaboxService — WhatsApp Business API via Gallabox
 *
 * Replaces Meta Cloud API for outbound WhatsApp campaign messages.
 * Handles:
 *  - Sending template messages (campaigns)
 *  - Sending free-form text messages (AI replies / follow-ups)
 *  - Fetching / syncing contacts from Gallabox
 *  - Creating new contacts in Gallabox
 */

export interface GallaboxConfig {
  apiKey: string;
  apiSecret: string;
  accountId?: string;
}

export interface GallaboxSendMessageParams {
  /** Recipient phone number in E.164 format, e.g. "919876543210" */
  to: string;
  /** Channel name in Gallabox (usually your WhatsApp number) */
  channelId?: string;
  type: 'text' | 'template' | 'image';
  /** Plain text body (for type=text) */
  text?: string;
  /** Template message params (for type=template) */
  template?: GallaboxTemplateParams;
  /** Image params (for type=image) */
  image?: GallaboxImageParams;
}

export interface GallaboxTemplateParams {
  /** Approved template name in Gallabox / Meta */
  name: string;
  language?: string;
  /** Body variable values in order */
  bodyVariables?: string[];
  /** Header variable values */
  headerVariables?: string[];
}

export interface GallaboxImageParams {
  /** Publicly accessible image URL */
  url: string;
  /** Optional caption */
  caption?: string;
}

export interface GallaboxSendResult {
  success: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
}

export interface GallaboxContact {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  company?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface GallaboxCreateContactParams {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  designation?: string;
  website?: string;
  tags?: string[];
  customFields?: Record<string, string>;
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
    id?: string;
    name?: string;
    plan?: string;
  };
  error?: string;
}

export class GallaboxServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GallaboxServiceError';
  }
}

export class GallaboxService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl = 'https://server.gallabox.com/devapi';
  private readonly retries = 3;
  private readonly timeout = 30_000;

  constructor(config: GallaboxConfig) {
    this.apiKey    = config.apiKey;
    this.apiSecret = config.apiSecret;
    // accountId stored in Supabase integrations table; not needed for REST calls
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      'apikey':    this.apiKey,
      'apisecret': this.apiSecret,
      'Content-Type': 'application/json',
    };
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
            headers: { ...this.headers, ...(options.headers as Record<string, string> ?? {}) },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          // Gallabox returns 200/201 on success; 400/401/422 on errors
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
          // Exponential backoff: 1s, 2s, 4s
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
   * Test the connection — fetches account/channel info.
   */
  async testConnection(): Promise<GallaboxTestResult> {
    try {
      // GET /channels returns the list of configured WhatsApp channels
      const data = await this.fetchWithRetry<any>('/channels');
      return {
        success: true,
        accountInfo: {
          name: data?.data?.[0]?.channelName ?? 'Gallabox Account',
          plan: data?.plan,
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
   */
  async sendMessage(params: GallaboxSendMessageParams): Promise<GallaboxSendResult> {
    try {
      // Normalise phone: strip leading + but keep country code digits
      const phone = params.to.replace(/^\+/, '').replace(/\D/g, '');

      const payload: Record<string, any> = {
        channelId:    params.channelId ?? '',
        channelType:  'whatsapp',
        recipient:    { phone },
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
        return { success: false, error: 'Invalid message params: missing text, template, or image' };
      }

      const result = await this.fetchWithRetry<any>('/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Gallabox returns { id } or { data: { id } } depending on version
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
   * Fetch contacts from Gallabox (paginated; fetches up to 500 by default).
   */
  async getContacts(limit = 500, offset = 0): Promise<GallaboxContactsResult> {
    try {
      const data = await this.fetchWithRetry<any>(
        `/contacts?limit=${limit}&skip=${offset}`
      );

      const raw: any[] = data?.data ?? data?.contacts ?? [];
      const contacts: GallaboxContact[] = raw.map(c => ({
        id:           c._id ?? c.id ?? '',
        name:         c.name ?? c.displayName ?? '',
        phone:        c.phone ?? c.whatsappNumber ?? '',
        email:        c.email ?? undefined,
        company:      c.company ?? undefined,
        tags:         c.tags ?? [],
        customFields: c.customFields ?? {},
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
   * Check whether a phone number already exists in Gallabox contacts.
   * Returns the contact if found, null otherwise.
   */
  async findContactByPhone(phone: string): Promise<GallaboxContact | null> {
    try {
      const normalised = phone.replace(/^\+/, '').replace(/\D/g, '');
      const data = await this.fetchWithRetry<any>(
        `/contacts?phone=${encodeURIComponent(normalised)}&limit=1`
      );
      const raw: any[] = data?.data ?? data?.contacts ?? [];
      if (!raw.length) return null;

      const c = raw[0];
      return {
        id:    c._id ?? c.id ?? '',
        name:  c.name ?? '',
        phone: c.phone ?? normalised,
        email: c.email ?? undefined,
        company: c.company ?? undefined,
        tags: c.tags ?? [],
        customFields: c.customFields ?? {},
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a new contact in Gallabox.
   */
  async createContact(params: GallaboxCreateContactParams): Promise<{
    success: boolean;
    contactId?: string | undefined;
    error?: string | undefined;
  }> {
    try {
      const phone = params.phone.replace(/^\+/, '').replace(/\D/g, '');

      const payload: Record<string, any> = {
        name:  params.name,
        phone: phone,
      };

      if (params.email)       payload.email = params.email;
      if (params.company)     payload.company = params.company;
      if (params.designation) payload.designation = params.designation;
      if (params.website)     payload.website = params.website;
      if (params.tags?.length) payload.tags = params.tags;
      if (params.customFields && Object.keys(params.customFields).length) {
        payload.customFields = params.customFields;
      }

      const result = await this.fetchWithRetry<any>('/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const contactId: string | undefined =
        result?._id ?? result?.id ?? result?.data?._id ?? result?.data?.id;

      return { success: true, contactId: contactId };
    } catch (error) {
      console.error('[Gallabox] createContact error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing Gallabox contact by contact ID.
   */
  async updateContact(
    contactId: string,
    updates: Partial<GallaboxCreateContactParams>
  ): Promise<{ success: boolean; error?: string | undefined }> {
    try {
      await this.fetchWithRetry(`/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
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
   * Returns the Gallabox contact ID.
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

// ── Factory ───────────────────────────────────────────────────────────────────

export function createGallaboxService(
  overrides?: Partial<GallaboxConfig>
): GallaboxService {
  const apiKey    = overrides?.apiKey    ?? process.env.GALLABOX_API_KEY    ?? '';
  const apiSecret = overrides?.apiSecret ?? process.env.GALLABOX_SECRET_API ?? '';
  const accountId = overrides?.accountId ?? process.env.GALLABOX_ACCOUNT_ID ?? '';

  return new GallaboxService({ apiKey, apiSecret, accountId });
}

let _instance: GallaboxService | null = null;

export function getGallaboxService(): GallaboxService {
  if (!_instance) {
    _instance = createGallaboxService();
  }
  return _instance;
}

/** Reset the singleton (useful when credentials change at runtime). */
export function resetGallaboxService(): void {
  _instance = null;
}
