# Implementation Plan: Secure Auth Credentials

## Overview

Replace plaintext API credentials in the `integrations` table with an envelope-encrypted credential store using AES-256-GCM. Implement the `platform_credentials` table, credential API routes, session guard, rate limiter, settings page, platform verifier, and a migration script. All tasks use TypeScript with Next.js 14 App Router.

## Tasks

- [x] 1. Database schema and SQL migrations
  - [x] 1.1 Create `platform_credentials` table migration
    - Write `supabase/migrations/YYYYMMDD_platform_credentials.sql` with the full DDL: UUID primary key, `user_id` FK to `auth.users`, `platform_name` CHECK constraint, `encrypted_payload`, `encrypted_dek`, `iv`, `created_at`, `updated_at`, `last_verified_at`, UNIQUE `(user_id, platform_name)`, RLS enabled, owner policy, and `update_updated_at_column` trigger
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 Create `contact_sync_log` and `pending_contacts` table migrations
    - Write the DDL for both tables including CHECK constraints, `user_id` FK, RLS enabled, and owner policies
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 2. Envelope encryption module (`lib/credentials/crypto.ts`)
  - [x] 2.1 Implement `getMEK`, `encryptCredential`, and `decryptCredential`
    - Use Node.js built-in `crypto` (AES-256-GCM, 96-bit IV, 256-bit DEK)
    - `getMEK()` reads from Supabase Vault via `supabaseAdmin.rpc('vault_get_secret', ...)`; never falls back to env vars
    - `encryptCredential(payload)` generates a random DEK and IV, encrypts payload, then wraps the DEK with the MEK; return `{ encryptedPayload, encryptedDek, iv }` as base64 strings
    - `decryptCredential(row)` unwraps the DEK with MEK, decrypts the payload, returns the parsed `Record<string, string>`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 2.2 Write property test for encryption round-trip (Property 1)
    - **Property 1: Encryption Round-Trip Preserves Credentials**
    - Use `fast-check` to generate arbitrary `Record<string, string>` payloads; mock `getMEK()` to return a fixed 32-byte key; assert `decryptCredential(await encryptCredential(payload))` deep-equals `payload`
    - **Validates: Requirements 3.2, 3.4, 10.1**

  - [ ]* 2.3 Write property test for IV uniqueness (Property 2)
    - **Property 2: IV Uniqueness Across Encryptions**
    - Use `fast-check` to generate 100 arbitrary payloads; collect the `iv` field from each `encryptCredential` result; assert all values are distinct
    - **Validates: Requirements 3.2**

- [x] 3. Session guard (`lib/credentials/sessionGuard.ts`)
  - [x] 3.1 Implement `requireSession(request)`
    - Extract the Bearer token from `Authorization` header; call `supabaseAdmin.auth.getUser(token)`; return `{ user: { uid, email } }` on success or a `NextResponse` 401 on failure
    - _Requirements: 4.1, 4.2_

  - [ ]* 3.2 Write unit tests for `requireSession`
    - Test: valid token returns user object; missing `Authorization` header returns 401; `getUser` error returns 401; null user returns 401
    - _Requirements: 4.1, 4.2_

- [x] 4. Rate limiter (`lib/credentials/rateLimiter.ts`)
  - [x] 4.1 Implement `checkRateLimit(uid, nowMs?)`
    - In-memory LRU `Map` keyed by `uid:windowStart`; 10 requests per 60-second window; return `{ allowed: true }` or `{ allowed: false, retryAfterSeconds }`; evict oldest entry when `store.size >= 10_000`; catch store errors and fail-open with a `console.warn`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 4.2 Write property test for rate limit threshold enforcement (Property 8)
    - **Property 8: Rate Limit Threshold Enforcement**
    - Use `fast-check` to generate valid UID strings; simulate exactly 10 calls within the same 60-second window and assert all return `allowed: true`; simulate the 11th call and assert `allowed: false` with `retryAfterSeconds <= 60`
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 4.3 Write property test for per-user rate limiter isolation (Property 7)
    - **Property 7: Rate Limiter Per-User Isolation**
    - Use `fast-check` to generate two distinct UID strings; exhaust the quota for the first; assert the second UID still returns `allowed: true`
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 4.4 Write unit test for rate limiter fail-open behavior
    - Stub the internal `Map` to throw on `get`; call `checkRateLimit`; assert result is `{ allowed: true }` and `console.warn` was called
    - _Requirements: 5.5_

- [x] 5. Credential repository (`lib/credentials/repo.ts`)
  - [x] 5.1 Implement `upsertCredential`, `getCredential`, `deleteCredential`, `touchLastVerified`, and `listCredentialStatuses`
    - All queries are scoped to the caller's `uid` via `user_id` column; use `supabaseAdmin`; upsert uses `onConflict: 'user_id,platform_name'`; define `PlatformName` union type and `CredentialRow` interface
    - _Requirements: 2.2, 4.3, 7.2_

  - [ ]* 5.2 Write unit tests for repo functions
    - Mock `supabaseAdmin` to return expected shapes; test `upsertCredential` calls upsert with correct args; `getCredential` scopes to `uid`; `listCredentialStatuses` returns array with correct shape
    - _Requirements: 2.2, 4.3_

- [x] 6. Credential API routes (`app/api/credentials/`)
  - [x] 6.1 Implement `GET /api/credentials/status` route
    - Create `app/api/credentials/status/route.ts`; apply session guard → rate limit → `listCredentialStatuses(uid)` → return `CredentialStatusResponse` JSON
    - _Requirements: 4.1, 4.2, 5.1, 6.5_

  - [x] 6.2 Implement `PUT /api/credentials/[platform]` route
    - Create `app/api/credentials/[platform]/route.ts`; apply session guard → rate limit → validate platform name → parse body → `encryptCredential` → `upsertCredential`; return `{ success: true }` on success; return 400 for invalid platform; return 422 if encryption throws
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 5.1_

  - [x] 6.3 Implement `DELETE /api/credentials/[platform]` route
    - Add `DELETE` handler in the same file; session guard → rate limit → validate platform → `deleteCredential`; return 404 if row not found; return 403 if cross-user attempt detected
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1_

  - [x] 6.4 Implement `POST /api/credentials/[platform]/verify` route
    - Create `app/api/credentials/[platform]/verify/route.ts`; session guard → rate limit → validate platform → `getCredential` (404 if null) → `decryptCredential` (422 on auth tag mismatch) → `verifyPlatformCredential` → if success, `touchLastVerified` and return `{ success: true }`; on failure return 502 with sanitised error; on timeout return 504
    - _Requirements: 4.1, 4.2, 5.1, 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3_

  - [ ]* 6.5 Write property test for unauthenticated requests always rejected (Property 6)
    - **Property 6: Unauthenticated Requests Always Rejected**
    - Use `fast-check` to generate missing/malformed/expired token strings; for each, call the route handler with a mocked `requireSession` returning 401; assert HTTP 401 is returned and no database query is made
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 6.6 Write property test for missing credential returns 404 (Property 12)
    - **Property 12: Missing Credential Returns 404**
    - Use `fast-check` to generate (platform, uid) pairs; mock `getCredential` to return `null`; assert the verify and service invocation routes return HTTP 404
    - **Validates: Requirements 10.2**

  - [ ]* 6.7 Write unit tests for decryption error handling
    - Tamper with `encryptedPayload` (flip a byte); call the verify route; assert HTTP 422 is returned and the response body does not contain internal error details
    - _Requirements: 3.5_

  - [ ]* 6.8 Write unit test for verify endpoint timeout (504)
    - Mock the platform service to hang beyond 35 seconds using fake timers; assert the route returns HTTP 504
    - _Requirements: 7.4_

- [ ] 7. Checkpoint — core API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Platform verifier (`lib/credentials/verifier.ts`)
  - [x] 8.1 Implement `verifyPlatformCredential(platform, plaintext)`
    - Route to `createGallaboxService(overrides)` for Gallabox and equivalent for Omnisend (refactor `OmnisendService` to accept optional constructor overrides); add stub branches for Shopify, Meta Ads, and Klaviyo; wrap each call in a 35-second `Promise.race` timeout; catch errors and return `{ success: false, error: sanitise(msg) }`
    - _Requirements: 7.1, 7.3, 7.4, 10.1_

  - [x] 8.2 Refactor `OmnisendService` to accept optional credential overrides
    - Add optional `apiKey?: string` parameter to `OmnisendService` constructor (or create `createOmnisendService(overrides)` factory function) mirroring the `createGallaboxService` pattern; ensure existing code paths using env-var defaults continue to work
    - _Requirements: 10.1_

  - [ ]* 8.3 Write property test for error message length bound (Property 10)
    - **Property 10: Error Message Length Bound**
    - Use `fast-check` to generate arbitrary strings of any length; pass each through `sanitise()`; assert the returned string's length is ≤ 200
    - **Validates: Requirements 6.6**

  - [ ]* 8.4 Write property test for `last_verified_at` updated iff verification succeeds (Property 11)
    - **Property 11: last_verified_at Updated Iff Verification Succeeds**
    - Mock `touchLastVerified` as a spy; for any verification result (success/failure/timeout), assert `touchLastVerified` is called exactly once on success and never on failure or timeout
    - **Validates: Requirements 7.2, 7.3**

- [x] 9. Middleware extension (`middleware.ts`)
  - [x] 9.1 Extend root `middleware.ts` to protect `/settings` and `/api/credentials/*`
    - Add `@supabase/ssr` session-cookie check for `/settings` paths; redirect to `/login` if no valid session; add Bearer token presence check for `/api/credentials/*`; return 401 JSON if missing; preserve all existing middleware logic and public route exemptions
    - _Requirements: 4.1, 4.2, 6.1, 6.2_

  - [ ]* 9.2 Write unit tests for middleware route guards
    - Mock `supabase.auth.getUser()` returning null for `/settings`; assert redirect to `/login`; mock missing `Authorization` header for `/api/credentials/status`; assert 401 response
    - _Requirements: 6.2, 4.1_

- [x] 10. Settings page and credential UI components
  - [x] 10.1 Implement `deriveStatus` pure function and `CredentialStatus` type
    - Create `lib/credentials/statusUtils.ts` with the `deriveStatus(rowExists, lastVerifiedAt)` function returning `'not_configured' | 'configured' | 'verified'`
    - _Requirements: 6.5_

  - [ ]* 10.2 Write property test for credential status derivation (Property 9)
    - **Property 9: Credential Status Derivation**
    - Use `fast-check` to generate all combinations of `(rowExists: boolean, lastVerifiedAt: string | null)`; assert `deriveStatus` returns exactly `'not_configured'` when `rowExists` is false, `'configured'` when `rowExists` is true and `lastVerifiedAt` is null, and `'verified'` otherwise
    - **Validates: Requirements 6.5**

  - [x] 10.3 Implement `CredentialCard` client component
    - Create `components/features/settings/CredentialCard.tsx`; render credential input fields as `type="password"` with Lucide `Eye`/`EyeOff` toggle; show status badge (`not configured` / `configured` / `verified`); submit calls `PUT /api/credentials/{platform}` with Bearer token in `Authorization` header; clear form state on success; verify button calls `POST /api/credentials/{platform}/verify` and shows success checkmark or error message capped at 200 chars
    - Apply design tokens: `font-mono` for credential labels, `brand-yellow` for Save/Verify buttons
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 10.4 Implement `CredentialManager` client component and `app/settings/page.tsx` server component
    - Create `components/features/settings/CredentialManager.tsx` rendering one `CredentialCard` per platform in order: Gallabox, Omnisend, Shopify, Meta Ads, Klaviyo
    - Create `app/settings/page.tsx` as an RSC: check session via `@supabase/ssr`, redirect to `/login` if unauthenticated, call `listCredentialStatuses(user.id)` server-side, pass `initialStatuses` to `<CredentialManager>`; apply `bg-brand-navy` page background
    - Do NOT add `/settings` to the `Tab` union in `components/layout/Dashboard/types.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 11. Migration script (`scripts/migrate-credentials.ts`)
  - [ ] 11.1 Implement the credential backfill migration script
    - Read all `integrations` rows where `api_key` or `api_secret` is not null; map `provider` to `platform_name` via `mapProviderToPlatformName()`; resolve `user_id` from `brand_id`; encrypt each credential with `encryptCredential`; upsert into `platform_credentials` with `onConflict: 'user_id,platform_name'`; log successes and per-row errors without aborting; after backfill, run `DROP COLUMN IF EXISTS api_key` and `DROP COLUMN IF EXISTS api_secret` on `integrations`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 11.2 Write property test for provider-to-platform-name mapping (Property 13)
    - **Property 13: Provider-to-Platform-Name Mapping Is Total and Correct**
    - Use `fast-check` to enumerate each value in `['gallabox', 'omnisend', 'shopify', 'meta', 'klaviyo']`; assert `mapProviderToPlatformName` returns the correct `platform_name` for each and never throws
    - **Validates: Requirements 9.3**

  - [ ]* 11.3 Write property test for migration idempotence (Property 14)
    - **Property 14: Migration Idempotence**
    - Mock `supabaseAdmin` upsert and RPC calls; run the migration function twice with the same seeded `integrations` data; assert `platform_credentials` row count is unchanged on the second run and no errors are thrown
    - **Validates: Requirements 9.6**

- [ ] 12. Checkpoint — final validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The language is TypeScript throughout (Next.js 14, Node.js 20+)
- `fast-check` is the property-based testing library (compatible with the TypeScript stack)
- All crypto operations use Node.js built-in `crypto` — no extra packages needed
- `supabaseAdmin` uses the service role key; never expose it client-side
- Property tests for RLS tenant isolation (Property 4) and per-user DEK isolation (Property 3) require a real Supabase test environment and are classified as integration tests — implement them separately with `supabaseAdmin.auth.admin.createUser`
- No plaintext credential values should appear in server logs, response bodies, or client-side state
- `/settings` must not appear as a Dashboard tab

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "4.2", "4.3", "4.4", "5.2", "8.1", "8.2", "10.1"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "6.4", "8.3", "8.4", "10.2", "10.3", "11.1"] },
    { "id": 4, "tasks": ["6.5", "6.6", "6.7", "6.8", "9.1", "10.4", "11.2", "11.3"] },
    { "id": 5, "tasks": ["9.2"] }
  ]
}
```
