# Design Document — Secure Auth Credentials

## Overview

This design replaces plaintext API credentials stored in the `integrations` table with an envelope-encrypted credential store. All credential operations run server-side via a dedicated Next.js 14 App Router Credential API (`/api/credentials/`). A Supabase Vault–held Master Encryption Key (MEK) wraps per-user Data Encryption Keys (DEKs); the credentials themselves are encrypted with AES-256-GCM using the Node.js built-in `crypto` module. A standalone Settings page at `/settings` lets authenticated users manage credentials per platform. Authentication is enforced via `@supabase/ssr`-based middleware in the root `middleware.ts`. Rate limiting is handled by an in-memory LRU map keyed on `uid:window_start`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  /settings page (app/settings/page.tsx — App Router RSC)   │
│    └─ CredentialCard × 5 platforms  (Client Component)     │
│         POST /api/credentials/{platform}                    │
│         GET  /api/credentials/status                        │
│         POST /api/credentials/{platform}/verify             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS, Bearer JWT
┌──────────────────────────▼──────────────────────────────────┐
│  middleware.ts (root, @supabase/ssr)                        │
│  • Protect /settings → redirect to /login if no session     │
│  • Protect /api/credentials/* → 401 if no Bearer token      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Credential API  app/api/credentials/                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Session Guard  (lib/credentials/sessionGuard.ts)   │   │
│  │  Rate Limiter   (lib/credentials/rateLimiter.ts)    │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  Envelope Encryption  (lib/credentials/crypto.ts)   │   │
│  │  • getMEK()  ← Supabase Vault (supabaseAdmin)       │   │
│  │  • encryptCredential(payload)                       │   │
│  │  • decryptCredential(row)                           │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  Credential Repository  (lib/credentials/repo.ts)   │   │
│  │  • upsert, get, delete on platform_credentials      │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  Platform Verifier  (lib/credentials/verifier.ts)   │   │
│  │  • createGallaboxService(overrides) → testConnection│   │
│  │  • createOmnisendService(overrides) → testConnection│   │
│  │  • (shopify / meta_ads / klaviyo stubs)             │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Supabase (PostgreSQL + Auth + Vault)                       │
│  • platform_credentials  (RLS: user_id = auth.uid())        │
│  • contact_sync_log      (RLS: user_id = auth.uid())        │
│  • pending_contacts      (RLS: user_id = auth.uid())        │
│  • vault.secrets          ← MEK stored here                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. `middleware.ts` (project root)

Extends the existing middleware to handle:

- **`/settings` and all sub-paths**: Use `@supabase/ssr` to check the session cookie. If no valid session, redirect to `/login`.
- **`/api/credentials/*`**: Require `Authorization: Bearer <token>` header; return 401 otherwise.
- All existing public route exemptions are preserved.

```typescript
// middleware.ts (extended)
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const CREDENTIAL_API_PREFIX = '/api/credentials/';
const SETTINGS_PREFIX = '/settings';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // --- Settings page: session-cookie auth ---
  if (pathname.startsWith(SETTINGS_PREFIX)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { /* cookie helpers */ } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // --- Credential API: Bearer token required ---
  if (pathname.startsWith(CREDENTIAL_API_PREFIX)) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ... existing logic unchanged
}
```

### 2. Envelope Encryption Module (`lib/credentials/crypto.ts`)

All cryptographic operations use Node.js `crypto` (built-in, no extra packages).

**MEK retrieval** uses `supabaseAdmin` to read from Supabase Vault:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { supabaseAdmin } from '../../supabase/supabase';

const VAULT_SECRET_NAME = 'platform_credentials_mek';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit IV
const KEY_BYTES = 32;  // 256-bit key
const AUTH_TAG_BYTES = 16;

export async function getMEK(): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.rpc('vault_get_secret', {
    secret_name: VAULT_SECRET_NAME,
  });
  if (error || !data) throw new Error('Failed to retrieve MEK from Vault');
  return Buffer.from(data as string, 'base64');
}

export interface EncryptedCredential {
  encryptedPayload: string; // base64
  encryptedDek: string;     // base64
  iv: string;               // base64
}

export async function encryptCredential(
  payload: Record<string, string>
): Promise<EncryptedCredential> {
  const mek = await getMEK();

  // Generate per-credential DEK and IV
  const dek = randomBytes(KEY_BYTES);
  const iv  = randomBytes(IV_BYTES);

  // Encrypt payload with DEK
  const cipher = createCipheriv(ALGORITHM, dek, iv);
  const payloadJson = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(payloadJson, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedPayload = Buffer.concat([encrypted, authTag]);

  // Encrypt DEK with MEK
  const dekIv = randomBytes(IV_BYTES);
  const dekCipher = createCipheriv(ALGORITHM, mek, dekIv);
  const encryptedDekBuf = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
  const dekAuthTag = dekCipher.getAuthTag();
  const encryptedDekFull = Buffer.concat([dekIv, encryptedDekBuf, dekAuthTag]);

  return {
    encryptedPayload: encryptedPayload.toString('base64'),
    encryptedDek: encryptedDekFull.toString('base64'),
    iv: iv.toString('base64'),
  };
}

export async function decryptCredential(
  row: EncryptedCredential
): Promise<Record<string, string>> {
  const mek = await getMEK();

  const encryptedDekFull = Buffer.from(row.encryptedDek, 'base64');
  const dekIv      = encryptedDekFull.subarray(0, IV_BYTES);
  const dekBody    = encryptedDekFull.subarray(IV_BYTES, encryptedDekFull.length - AUTH_TAG_BYTES);
  const dekAuthTag = encryptedDekFull.subarray(encryptedDekFull.length - AUTH_TAG_BYTES);

  const dekDecipher = createDecipheriv(ALGORITHM, mek, dekIv);
  dekDecipher.setAuthTag(dekAuthTag);
  const dek = Buffer.concat([dekDecipher.update(dekBody), dekDecipher.final()]);

  const encryptedPayloadFull = Buffer.from(row.encryptedPayload, 'base64');
  const payloadBody   = encryptedPayloadFull.subarray(0, encryptedPayloadFull.length - AUTH_TAG_BYTES);
  const payloadAuthTag = encryptedPayloadFull.subarray(encryptedPayloadFull.length - AUTH_TAG_BYTES);
  const iv = Buffer.from(row.iv, 'base64');

  const decipher = createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(payloadAuthTag);
  const plaintext = Buffer.concat([decipher.update(payloadBody), decipher.final()]).toString('utf8');

  return JSON.parse(plaintext) as Record<string, string>;
}
```

**Error handling**: Any `createDecipheriv`/`final()` call that throws due to an auth tag mismatch propagates as a caught error; the route handler converts it to HTTP 422.

### 3. Session Guard (`lib/credentials/sessionGuard.ts`)

```typescript
import { supabaseAdmin } from '../../supabase/supabase';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

export async function requireSession(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const token = request.headers.get('authorization')?.slice(7) ?? '';
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return { user: { uid: data.user.id, email: data.user.email ?? '' } };
}
```

Usage pattern in every route handler:

```typescript
const authResult = await requireSession(request);
if (authResult instanceof NextResponse) return authResult;
const { user } = authResult;
// rate limit check next...
```

### 4. Rate Limiter (`lib/credentials/rateLimiter.ts`)

In-memory LRU map; no Redis dependency. Key format: `uid:windowStart` where `windowStart` is the Unix second of the start of the 60-second window.

```typescript
const WINDOW_SECONDS = 60;
const MAX_REQUESTS   = 10;
const MAX_ENTRIES    = 10_000; // LRU eviction cap

// Simple LRU: Map insertion order + delete-on-read-then-reinsert
const store = new Map<string, number>();

function evictIfNeeded(): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(uid: string, nowMs: number = Date.now()): RateLimitResult {
  try {
    const windowStart = Math.floor(nowMs / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS;
    const key = `${uid}:${windowStart}`;
    const count = store.get(key) ?? 0;

    if (count >= MAX_REQUESTS) {
      const windowEnd = windowStart + WINDOW_SECONDS;
      return { allowed: false, retryAfterSeconds: windowEnd - Math.floor(nowMs / 1000) };
    }

    evictIfNeeded();
    store.set(key, count + 1);
    // Move to end for LRU ordering
    const val = store.get(key)!;
    store.delete(key);
    store.set(key, val);

    return { allowed: true };
  } catch (err) {
    // Fail-open: store unavailability must not block requests
    console.warn('[RateLimiter] store error — failing open:', err);
    return { allowed: true };
  }
}
```

### 5. Credential Repository (`lib/credentials/repo.ts`)

Wraps all `platform_credentials` Supabase queries. Always scoped to the caller's `uid` via the `user_id` column; RLS provides a second line of defence.

```typescript
import { supabaseAdmin } from '../../supabase/supabase';
import type { EncryptedCredential } from './crypto';

export type PlatformName = 'gallabox' | 'omnisend' | 'shopify' | 'meta_ads' | 'klaviyo';

export interface CredentialRow extends EncryptedCredential {
  id: string;
  userId: string;
  platformName: PlatformName;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
}

export async function upsertCredential(
  uid: string,
  platform: PlatformName,
  encrypted: EncryptedCredential
): Promise<void> { /* ... */ }

export async function getCredential(
  uid: string,
  platform: PlatformName
): Promise<CredentialRow | null> { /* ... */ }

export async function deleteCredential(
  uid: string,
  platform: PlatformName
): Promise<void> { /* ... */ }

export async function touchLastVerified(
  uid: string,
  platform: PlatformName
): Promise<void> { /* ... */ }

export async function listCredentialStatuses(uid: string): Promise<
  Array<{ platformName: PlatformName; lastVerifiedAt: string | null }>
> { /* ... */ }
```

### 6. Credential API Routes (`app/api/credentials/`)

All routes follow the same guard pattern: **session → rate limit → business logic**.

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/api/credentials/status` | List status of all platforms for the current user |
| `PUT`  | `/api/credentials/[platform]` | Upsert encrypted credential for a platform |
| `DELETE` | `/api/credentials/[platform]` | Delete credential for a platform |
| `POST` | `/api/credentials/[platform]/verify` | Decrypt & test live connection |

**Route guard composition (pseudocode):**

```typescript
// app/api/credentials/[platform]/route.ts
export async function PUT(request: NextRequest, { params }: { params: { platform: string } }) {
  // 1. Session validation
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  // 2. Rate limiting
  const rl = checkRateLimit(auth.user.uid);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    });
  }

  // 3. Validate platform name
  if (!isValidPlatform(params.platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  // 4. Parse body, encrypt, upsert
  const body = await request.json();
  const encrypted = await encryptCredential(body);
  await upsertCredential(auth.user.uid, params.platform as PlatformName, encrypted);

  return NextResponse.json({ success: true });
}
```

**Decryption error handling:**

```typescript
try {
  const plaintext = await decryptCredential(row);
  // use plaintext...
} catch {
  return NextResponse.json(
    { error: 'Credential data is corrupted' },
    { status: 422 }
  );
}
```

### 7. Platform Verifier (`lib/credentials/verifier.ts`)

Routes the `verify` call to the correct service factory and enforces the 35-second timeout.

```typescript
import { createGallaboxService } from '../services/external/GallaboxService';

export interface VerifyResult {
  success: boolean;
  error?: string;
}

const VERIFY_TIMEOUT_MS = 35_000;

export async function verifyPlatformCredential(
  platform: PlatformName,
  plaintext: Record<string, string>
): Promise<VerifyResult> {
  const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), VERIFY_TIMEOUT_MS)
      ),
    ]);

  try {
    switch (platform) {
      case 'gallabox': {
        const svc = createGallaboxService({
          apiKey:    plaintext.apiKey    ?? '',
          apiSecret: plaintext.apiSecret ?? '',
          accountId: plaintext.accountId ?? '',
        });
        const result = await withTimeout(svc.testConnection());
        return { success: result.success, error: result.error };
      }
      case 'omnisend': {
        // createOmnisendService(overrides) pattern — see OmnisendService refactor note
        // ...
      }
      // shopify / meta_ads / klaviyo: similar pattern
      default:
        return { success: false, error: `Verification not implemented for ${platform}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg === 'TIMEOUT') return { success: false, error: 'Connection timed out' };
    return { success: false, error: sanitise(msg) };
  }
}

function sanitise(raw: string): string {
  // Strip stack traces, internal paths, secrets
  return raw.replace(/\n[\s\S]*/g, '').slice(0, 200);
}
```

**Note on `OmnisendService`**: The current `OmnisendService` constructor reads from `config` directly. It needs a small refactor to accept optional constructor overrides (`apiKey?: string`) parallel to `createGallaboxService`, so the verifier can inject decrypted credentials.

### 8. Settings Page (`app/settings/page.tsx`)

Server Component (RSC) that fetches credential statuses server-side, then renders `<CredentialManager>` as a Client Component.

```typescript
// app/settings/page.tsx  (Server Component)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CredentialManager } from '../../components/features/settings/CredentialManager';

export default async function SettingsPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch statuses server-side (no plaintext exposure)
  const statuses = await listCredentialStatuses(user.id);

  return (
    <div className="min-h-screen bg-brand-navy">
      <CredentialManager initialStatuses={statuses} />
    </div>
  );
}
```

**`CredentialManager` / `CredentialCard` (Client Component):**

- One `CredentialCard` per platform in the order: Gallabox, Omnisend, Shopify, Meta Ads, Klaviyo.
- Each card shows status badge (`not configured` / `configured` / `verified`).
- Credential input fields are `type="password"` with a Lucide `Eye`/`EyeOff` toggle.
- Submit calls `PUT /api/credentials/{platform}` with the session JWT in the `Authorization` header.
- After successful submission, form state is cleared (`useState('')` reset).
- Verify button calls `POST /api/credentials/{platform}/verify`; renders success checkmark or error message (capped at 200 chars).
- Design tokens: `bg-brand-navy` page background, `font-mono` for credential labels, `brand-yellow` for primary buttons (Save / Verify).
- The `/settings` route is **not** added to the `Tab` union in `components/layout/Dashboard/types.ts`.

**Status derivation (pure function):**

```typescript
type CredentialStatus = 'not_configured' | 'configured' | 'verified';

function deriveStatus(
  rowExists: boolean,
  lastVerifiedAt: string | null
): CredentialStatus {
  if (!rowExists)       return 'not_configured';
  if (!lastVerifiedAt)  return 'configured';
  return 'verified';
}
```

### 9. Migration Script (`scripts/migrate-credentials.ts`)

TypeScript (not pure SQL) because it needs to call the Node.js `crypto` module and the Supabase Vault RPC to encrypt during backfill. Run via `npx ts-node scripts/migrate-credentials.ts`.

```typescript
// scripts/migrate-credentials.ts
import { supabaseAdmin } from '../supabase/supabase';
import { encryptCredential } from '../lib/credentials/crypto';

const PROVIDER_MAP: Record<string, string> = {
  gallabox: 'gallabox',
  omnisend: 'omnisend',
  shopify:  'shopify',
  meta:     'meta_ads',
  klaviyo:  'klaviyo',
};

async function run(): Promise<void> {
  // 1. Ensure platform_credentials table exists (idempotent DDL handled by SQL migration)

  // 2. Read integrations rows with non-null credentials
  const { data: rows, error } = await supabaseAdmin
    .from('integrations')
    .select('id, provider, api_key, api_secret, account_id, brand_id')
    .or('api_key.not.is.null,api_secret.not.is.null');

  if (error) { console.error('Failed to read integrations:', error); process.exit(1); }

  for (const row of rows ?? []) {
    try {
      const platformName = PROVIDER_MAP[row.provider];
      if (!platformName) {
        console.warn(`[skip] Unknown provider: ${row.provider}`);
        continue;
      }

      // Map brand_id to a user_id (owner of the brand)
      const userId = await resolveUserIdFromBrand(row.brand_id);
      if (!userId) {
        console.warn(`[skip] No user found for brand ${row.brand_id}`);
        continue;
      }

      const payload: Record<string, string> = {};
      if (row.api_key)    payload.apiKey    = row.api_key;
      if (row.api_secret) payload.apiSecret = row.api_secret;
      if (row.account_id) payload.accountId = row.account_id;

      const encrypted = await encryptCredential(payload);

      // Idempotent upsert
      await supabaseAdmin.from('platform_credentials').upsert({
        user_id:           userId,
        platform_name:     platformName,
        encrypted_payload: encrypted.encryptedPayload,
        encrypted_dek:     encrypted.encryptedDek,
        iv:                encrypted.iv,
      }, { onConflict: 'user_id,platform_name', ignoreDuplicates: false });

      console.log(`[ok] Migrated integrations.id=${row.id} → ${platformName}`);
    } catch (err) {
      console.error(`[error] integrations.id=${row.id}:`, err);
      // Continue to next row — do not abort
    }
  }

  // 3. Drop legacy columns (idempotent — IF EXISTS)
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      ALTER TABLE integrations DROP COLUMN IF EXISTS api_key;
      ALTER TABLE integrations DROP COLUMN IF EXISTS api_secret;
    `,
  });

  console.log('[done] Migration complete.');
}

run().catch(console.error);
```

**Idempotence**: The `upsert` with `onConflict: 'user_id,platform_name'` means a second run overwrites (re-encrypts) existing rows rather than duplicating. `DROP COLUMN IF EXISTS` is a no-op if columns are already gone.

---

## Data Models

### `platform_credentials` (new table)

```sql
CREATE TABLE platform_credentials (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_name    TEXT        NOT NULL
                               CHECK (platform_name IN ('gallabox','omnisend','shopify','meta_ads','klaviyo')),
  encrypted_payload TEXT       NOT NULL,   -- base64 AES-256-GCM ciphertext + auth tag
  encrypted_dek    TEXT        NOT NULL,   -- base64 [ dekIv | encryptedDek | dekAuthTag ]
  iv               TEXT        NOT NULL,   -- base64 96-bit payload IV
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  UNIQUE (user_id, platform_name)
);

ALTER TABLE platform_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_credentials_owner"
  ON platform_credentials
  FOR ALL
  USING (user_id = auth.uid());

CREATE TRIGGER update_platform_credentials_updated_at
  BEFORE UPDATE ON platform_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### `contact_sync_log` (new table)

```sql
CREATE TABLE contact_sync_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_name    TEXT        NOT NULL,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  records_imported INTEGER     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL CHECK (status IN ('success','partial','error')),
  error_message    TEXT
);

ALTER TABLE contact_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_sync_log_owner"
  ON contact_sync_log FOR ALL USING (user_id = auth.uid());
```

### `pending_contacts` (new table)

```sql
CREATE TABLE pending_contacts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_name TEXT        NOT NULL,
  raw_payload   JSONB       NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','imported','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pending_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_contacts_owner"
  ON pending_contacts FOR ALL USING (user_id = auth.uid());
```

### Envelope Encryption Layout

```
Stored: encrypted_payload = base64(ciphertext ‖ authTag[16])
Stored: encrypted_dek     = base64(dekIv[12] ‖ encryptedDek[32] ‖ dekAuthTag[16])
Stored: iv                = base64(payloadIv[12])
```

---

### Credential API Request/Response Types

```typescript
// PUT /api/credentials/[platform]
interface UpsertCredentialRequest {
  // Gallabox
  apiKey?:    string;
  apiSecret?: string;
  accountId?: string;
  channelId?: string;
  // Omnisend
  apiKey?:    string;
  // Shopify
  shopDomain?:    string;
  clientId?:      string;
  clientSecret?:  string;
  // Meta Ads
  accessToken?:   string;
  adAccountId?:   string;
  // Klaviyo
  apiKey?:        string;
}

interface UpsertCredentialResponse {
  success: true;
}

// GET /api/credentials/status
interface CredentialStatusResponse {
  platforms: Array<{
    platformName: PlatformName;
    status: 'not_configured' | 'configured' | 'verified';
    lastVerifiedAt: string | null;
  }>;
}

// POST /api/credentials/[platform]/verify
interface VerifyCredentialResponse {
  success: boolean;
  error?: string; // max 200 chars, sanitised
}
```

---

## Error Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Missing / invalid Bearer token | 401 | `{ error: 'Unauthorized' }` |
| Cross-user access attempt | 403 | `{ error: 'Forbidden' }` |
| Credential not found | 404 | `{ error: 'Credential not configured' }` |
| Rate limit exceeded | 429 | `{ error: 'Too Many Requests' }` + `Retry-After` header |
| Auth tag mismatch on decrypt | 422 | `{ error: 'Credential data is corrupted' }` |
| External API error on verify | 502 | `{ error: '<sanitised message>' }` |
| External API timeout | 504 | `{ error: 'Gateway timeout' }` |
| Invalid platform name | 400 | `{ error: 'Invalid platform' }` |

Decryption errors are caught at the route handler level. Internal error details (stack traces, raw Supabase errors, crypto messages) are never forwarded to the client. The `sanitise()` helper in `verifier.ts` strips newlines and truncates to 200 characters.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Encryption Round-Trip Preserves Credentials

*For any* valid credential payload (a record of string key-value pairs), encrypting it with `encryptCredential()` and then decrypting the result with `decryptCredential()` shall return an object deeply equal to the original payload.

**Validates: Requirements 3.2, 3.4, 10.1**

---

### Property 2: IV Uniqueness Across Encryptions

*For any* two separate calls to `encryptCredential()` with any payloads (identical or different), the returned `iv` values shall differ with overwhelming probability (i.e., the IV is drawn from a cryptographically random source).

**Validates: Requirements 3.2**

---

### Property 3: Per-User DEK Isolation

*For any* two distinct users, the `encrypted_dek` stored in their respective `platform_credentials` rows shall differ, so that compromise of one user's DEK does not affect another user's credentials.

**Validates: Requirements 3.6**

---

### Property 4: RLS Tenant Isolation

*For any* two distinct authenticated users A and B, user A shall not be able to SELECT, INSERT, UPDATE, or DELETE a `platform_credentials` (or `contact_sync_log` or `pending_contacts`) row that belongs to user B (`user_id ≠ auth.uid()`).

**Validates: Requirements 2.3, 4.3, 4.4, 8.3, 8.4**

---

### Property 5: Platform Name Constraint Enforcement

*For any* string value not in `{ 'gallabox', 'omnisend', 'shopify', 'meta_ads', 'klaviyo' }`, attempting to insert a `platform_credentials` row with that value as `platform_name` shall be rejected by the database with a CHECK constraint violation.

**Validates: Requirements 2.4**

---

### Property 6: Unauthenticated Requests Always Rejected

*For any* request to any `/api/credentials/*` route carrying a missing, malformed, or expired Bearer token, the Credential API shall return HTTP 401 before performing any database query.

**Validates: Requirements 4.1, 4.2**

---

### Property 7: Rate Limiter Per-User Isolation

*For any* two distinct user IDs (even when originating from the same IP), their sliding-window request counters shall be tracked independently, so that user A exhausting their quota does not block user B.

**Validates: Requirements 5.1, 5.3**

---

### Property 8: Rate Limit Threshold Enforcement

*For any* authenticated user, after exactly 10 requests within a 60-second window, the next (11th) request to any Credential API route shall receive HTTP 429 with a `Retry-After` header, and the header value shall be ≤ 60 seconds.

**Validates: Requirements 5.1, 5.2**

---

### Property 9: Credential Status Derivation

*For any* combination of `(rowExists: boolean, lastVerifiedAt: string | null)`, the pure function `deriveStatus()` shall return exactly:
- `'not_configured'` when `rowExists` is `false`
- `'configured'` when `rowExists` is `true` and `lastVerifiedAt` is `null`
- `'verified'` when `rowExists` is `true` and `lastVerifiedAt` is a non-null timestamp string

**Validates: Requirements 6.5**

---

### Property 10: Error Message Length Bound

*For any* error string returned from the verify endpoint, the message displayed to the user on the Settings Page shall be at most 200 characters.

**Validates: Requirements 6.6**

---

### Property 11: last_verified_at Updated Iff Verification Succeeds

*For any* verification call, `last_verified_at` on the `platform_credentials` row shall be updated to the current timestamp if and only if the external platform API returns a successful response; it shall remain unchanged if the verification fails or times out.

**Validates: Requirements 7.2, 7.3**

---

### Property 12: Missing Credential Returns 404

*For any* (platform, authenticated user) pair where no `platform_credentials` row exists, any Credential API call requiring that credential (verify, service invocation) shall return HTTP 404.

**Validates: Requirements 10.2**

---

### Property 13: Provider-to-Platform-Name Mapping Is Total and Correct

*For any* value in `{ 'gallabox', 'omnisend', 'shopify', 'meta', 'klaviyo' }` (the `integrations.provider` domain), the migration mapping function `mapProviderToPlatformName()` shall return the correct `platform_name` value and never throw.

**Validates: Requirements 9.3**

---

### Property 14: Migration Idempotence

*For any* database state reached after running the migration script once, running the migration script a second time shall not insert duplicate rows into `platform_credentials`, shall not raise an error from `DROP COLUMN IF EXISTS`, and shall leave `platform_credentials` row count unchanged.

**Validates: Requirements 9.6**

---

### Property 15: Service Factory Receives Decrypted Values

*For any* stored credential, when the Credential API invokes a platform service, the arguments passed to the factory function (e.g., `createGallaboxService(overrides)`) shall equal the decrypted credential values and shall NOT equal the corresponding environment variable values when those differ.

**Validates: Requirements 10.1**


---

## Testing Strategy

### Unit Tests (example-based)

- `deriveStatus()` — one test per branch (`not_configured`, `configured`, `verified`)
- Session redirect in middleware — mock `supabase.auth.getUser()` returning null, verify redirect to `/login`
- Logout handler — verify `signOut()` called and redirect issued
- Rate limiter fail-open — stub `Map` to throw, verify request is allowed and warning logged
- `updateContact` trigger — insert row, update it, assert `updated_at` changed
- Verify endpoint timeout — mock external service to hang past 35 s, assert HTTP 504
- Auth tag mismatch — tamper with `encrypted_payload`, assert HTTP 422 with no internal details
- Unique constraint — insert duplicate `(user_id, platform_name)`, expect Postgres unique violation

### Property-Based Tests

Use [fast-check](https://github.com/dubzzz/fast-check) (already compatible with the Next.js/TypeScript stack):

- **Encryption round-trip** (Property 1): generate arbitrary `Record<string, string>` payloads → encrypt → decrypt → deep equal
- **IV uniqueness** (Property 2): generate 100 arbitrary payloads → collect IVs → assert all distinct
- **Per-user DEK isolation** (Property 3): generate two distinct UUIDs → encrypt same payload for each → assert `encrypted_dek` differs
- **Platform name constraint** (Property 5): generate arbitrary strings not in the allowed set → attempt insert → assert CHECK violation
- **Rate limiter per-user isolation** (Property 7): generate two distinct UIDs → exhaust quota for one → assert other is unaffected
- **Rate limit threshold** (Property 8): for any valid UID, call `checkRateLimit` 10 times → verify allowed; call 11th time → verify denied with `retryAfterSeconds ≤ 60`
- **Status derivation** (Property 9): generate `(rowExists: boolean, lastVerifiedAt: string | null)` combinations → assert `deriveStatus` returns correct status
- **Error message length** (Property 10): generate arbitrary error strings of any length → assert `sanitise()` output length ≤ 200
- **Provider mapping** (Property 13): for each value in `['gallabox','omnisend','shopify','meta','klaviyo']` → assert `mapProviderToPlatformName` returns expected value

### Integration Tests

- Supabase RLS tenant isolation (Property 4): create two real users via `supabaseAdmin.auth.admin.createUser`, insert rows for each, verify cross-user SELECT returns empty (1–2 representative user pairs)
- Invitation flow (Requirement 1.2): call `supabase.auth.admin.inviteUserByEmail`, verify response contains invite metadata
- Migration script end-to-end: seed `integrations` with plaintext rows, run migration, verify `platform_credentials` contains encrypted rows and `api_key`/`api_secret` columns are absent

### Smoke Tests

- Supabase project has `signup disabled` in Auth settings
- No OAuth providers are configured
- Session JWT max age is configured to 30 days
- `platform_credentials` table schema matches the DDL (all columns present)
- `contact_sync_log` and `pending_contacts` schemas are correct
- No Credential API route returns `encrypted_dek` or `mek` in the response body (code review)
