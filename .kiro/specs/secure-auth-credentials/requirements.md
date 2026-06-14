# Requirements Document

## Introduction

This feature replaces plaintext API credentials stored in the `integrations` table with an envelope-encrypted credential store. Platform credentials for Gallabox, Omnisend, Shopify, Meta Ads, and Klaviyo are encrypted server-side using AES-256-GCM with per-user Data Encryption Keys (DEKs) wrapped by a Master Encryption Key (MEK) held in Supabase Vault. A dedicated `platform_credentials` table scoped to `auth.uid()` replaces the plaintext `api_key` and `api_secret` columns. Authentication is handled by Supabase Auth (email + password, invite-only, 30-day sessions). A separate Settings page allows authenticated users to manage credentials per platform. All credential API routes enforce session validation and a per-user rate limit of 10 requests per minute. The migration backfills encrypted rows from the existing `integrations` table before dropping the legacy plaintext columns.

## Glossary

- **Auth System**: The Supabase Auth subsystem responsible for user sessions and identity.
- **Credential API**: The set of Next.js 14 App Router route handlers under `/api/credentials/` that perform CRUD operations on `platform_credentials`.
- **DEK (Data Encryption Key)**: A per-user AES-256-GCM key used to encrypt the credential payload. The DEK itself is encrypted by the MEK before storage.
- **Encrypted Payload**: The AES-256-GCM ciphertext of a platform's credential fields (e.g., `api_key`, `api_secret`, `account_id`).
- **Envelope Encryption**: A two-tier encryption scheme where plaintext is encrypted with a DEK and the DEK is encrypted with the MEK.
- **IV (Initialisation Vector)**: A 96-bit random nonce used per encryption operation to ensure ciphertext uniqueness.
- **MEK (Master Encryption Key)**: A single application-level key stored in Supabase Vault, used to encrypt and decrypt DEKs.
- **Platform**: One of the five supported external integrations: Gallabox, Omnisend, Shopify, Meta Ads, or Klaviyo.
- **platform_credentials**: The Supabase PostgreSQL table that stores per-user, per-platform encrypted credentials.
- **Rate Limiter**: The server-side middleware that enforces 10 requests per minute per authenticated user on Credential API routes.
- **RLS (Row-Level Security)**: PostgreSQL policy mechanism restricting data access to the row owner.
- **Settings Page**: The dedicated Next.js page at `/settings` where authenticated users manage platform credentials.
- **Supabase Vault**: The encrypted secrets manager built into Supabase, used to store the MEK.
- **contact_sync_log**: A table recording the outcome of per-platform contact synchronisation operations.
- **pending_contacts**: A table staging contacts awaiting import from external platforms.

---

## Requirements

### Requirement 1 — Invite-Only Authentication

**User Story:** As a system administrator, I want only invited users to be able to create accounts, so that access to the CRM is restricted to authorised personnel.

#### Acceptance Criteria

1. THE Auth System SHALL disable public user self-registration so that account creation requires an administrator-issued invitation.
2. WHEN an administrator invites a user by email, THE Auth System SHALL send an invitation link that allows the recipient to set a password and activate their account.
3. THE Auth System SHALL enforce email and password as the only credential type for interactive login.
4. THE Auth System SHALL issue sessions with a maximum lifetime of 30 days, after which the session is considered expired.
5. WHEN a session reaches its 30-day expiry, THE Auth System SHALL invalidate the session token and redirect the user to `/login`.
6. WHEN a user calls the logout action, THE Auth System SHALL call `supabase.auth.signOut()` and redirect the user to `/login`.

---

### Requirement 2 — platform_credentials Table and Schema

**User Story:** As a developer, I want a dedicated encrypted credentials table scoped to each user, so that plaintext secrets are never persisted in the database.

#### Acceptance Criteria

1. THE `platform_credentials` table SHALL contain the columns: `id` (UUID, primary key), `user_id` (UUID, foreign key referencing `auth.users.id`, not null), `platform_name` (TEXT, not null), `encrypted_payload` (BYTEA or TEXT, not null), `encrypted_dek` (BYTEA or TEXT, not null), `iv` (BYTEA or TEXT, not null), `created_at` (TIMESTAMPTZ, not null, default `now()`), `updated_at` (TIMESTAMPTZ, not null, default `now()`), and `last_verified_at` (TIMESTAMPTZ, nullable).
2. THE `platform_credentials` table SHALL enforce a unique constraint on `(user_id, platform_name)` so that each user holds at most one credential record per platform.
3. THE `platform_credentials` table SHALL have Row-Level Security enabled with a policy permitting SELECT, INSERT, UPDATE, and DELETE only when `user_id = auth.uid()`.
4. THE `platform_credentials` table SHALL accept `platform_name` values of `'gallabox'`, `'omnisend'`, `'shopify'`, `'meta_ads'`, and `'klaviyo'`, and SHALL reject any other value at the database constraint level.
5. WHEN a row in `platform_credentials` is updated, THE database SHALL automatically set `updated_at` to the current timestamp via a trigger.

---

### Requirement 3 — Envelope Encryption

**User Story:** As a security architect, I want credentials encrypted with envelope encryption using AES-256-GCM, so that compromising the database does not expose plaintext secrets.

#### Acceptance Criteria

1. THE Credential API SHALL perform all encryption and decryption operations server-side; the browser SHALL never receive or transmit a plaintext DEK or MEK.
2. WHEN storing a credential, THE Credential API SHALL generate a cryptographically random 96-bit IV and a 256-bit DEK, encrypt the credential JSON payload with AES-256-GCM using that DEK and IV, encrypt the DEK with the MEK retrieved from Supabase Vault, and persist `encrypted_payload`, `encrypted_dek`, and `iv` to `platform_credentials`.
3. THE Credential API SHALL retrieve the MEK exclusively from Supabase Vault using the `supabaseAdmin` client with the service role key; the MEK SHALL NOT be read from environment variables or any other source at runtime.
4. WHEN decrypting a credential, THE Credential API SHALL retrieve `encrypted_dek` and `iv` from `platform_credentials`, decrypt the DEK using the MEK from Supabase Vault, and use the DEK to decrypt `encrypted_payload` to recover the plaintext credential JSON.
5. IF decryption fails due to an authentication tag mismatch, THEN THE Credential API SHALL return HTTP 422 and SHALL NOT expose internal error details to the client.
6. THE Credential API SHALL use a distinct DEK per user; re-encrypting one user's credentials SHALL NOT require re-encrypting another user's credentials.

---

### Requirement 4 — Session Validation on All Credential Routes

**User Story:** As a security engineer, I want every credential API route to validate the caller's session, so that unauthenticated requests are rejected before any data is accessed.

#### Acceptance Criteria

1. WHEN a request reaches any Credential API route, THE Credential API SHALL call `supabase.auth.getUser()` with the request's Bearer token before executing any database query.
2. IF `supabase.auth.getUser()` returns an error or a null user, THEN THE Credential API SHALL return HTTP 401 and SHALL NOT proceed with the request.
3. THE Credential API SHALL scope all `platform_credentials` queries to the authenticated `auth.uid()` and SHALL NOT accept a `user_id` parameter supplied by the client.
4. IF a request attempts to read or modify a `platform_credentials` row with a `user_id` different from `auth.uid()`, THEN THE Credential API SHALL return HTTP 403.

---

### Requirement 5 — Per-User Rate Limiting on Credential Endpoints

**User Story:** As a security engineer, I want a rate limit on credential endpoints, so that brute-force and enumeration attacks are mitigated.

#### Acceptance Criteria

1. THE Rate Limiter SHALL enforce a maximum of 10 requests per 60-second sliding window per authenticated user on all Credential API routes.
2. WHEN a user's request count within the current 60-second window reaches 10, THE Rate Limiter SHALL return HTTP 429 with a `Retry-After` header indicating the number of seconds until the window resets.
3. THE Rate Limiter SHALL identify users by `auth.uid()` and SHALL NOT use IP address as the sole rate-limit key.
4. THE Rate Limiter SHALL persist window counters in a fast in-process or edge-compatible store (e.g., an in-memory LRU map keyed by `uid:window_start`); no external Redis dependency is introduced unless already present in the project.
5. IF the Rate Limiter store becomes unavailable, THEN THE Credential API SHALL allow the request to proceed and SHALL log a warning, rather than blocking all traffic.

---

### Requirement 6 — Settings Page for Credential Management

**User Story:** As an authenticated user, I want a dedicated Settings page where I can add, update, and verify credentials for each platform, so that I can manage integrations without editing environment variables.

#### Acceptance Criteria

1. THE Settings Page SHALL be accessible at the route `/settings` and SHALL NOT appear as a tab in the main Dashboard tab bar.
2. WHILE a user is unauthenticated, THE Settings Page SHALL redirect the user to `/login` before rendering any content.
3. THE Settings Page SHALL display one credential management card per supported platform: Gallabox, Omnisend, Shopify, Meta Ads, and Klaviyo.
4. WHEN a user submits the credential form for a platform, THE Settings Page SHALL POST the plaintext credential fields to the Credential API over HTTPS; the plaintext values SHALL NOT be stored in client-side state after the submission completes.
5. THE Settings Page SHALL indicate the connection status of each platform credential as one of: `not configured`, `configured`, or `verified`, derived from the presence of a `platform_credentials` row and the value of `last_verified_at`.
6. WHEN a user clicks the verify action for a platform, THE Settings Page SHALL call the verify endpoint, display a success indicator if verification passes, or display an error message limited to 200 characters if verification fails.
7. THE Settings Page SHALL apply the project design tokens: `bg-brand-navy` background, `font-mono` for credential input labels, and brand-yellow accents for primary action buttons.
8. THE Settings Page SHALL render credential input fields as password-type inputs, masking the values by default, with a toggle to reveal the value temporarily within the browser session.

---

### Requirement 7 — Platform Credential Verification

**User Story:** As a user, I want to test that stored credentials are valid against the external platform API, so that I know integrations are working before running campaigns.

#### Acceptance Criteria

1. WHEN the verify endpoint for Gallabox is called, THE Credential API SHALL decrypt the stored credential, instantiate `GallaboxService` via `createGallaboxService(overrides)` with the decrypted values, call `testConnection()`, and persist the current timestamp to `last_verified_at` if the test succeeds.
2. WHEN the verify endpoint for a platform is called, THE Credential API SHALL update `last_verified_at` on the `platform_credentials` row only when the external API returns a successful response.
3. IF the external platform API returns an error during verification, THEN THE Credential API SHALL return HTTP 502 with a sanitised error message and SHALL NOT update `last_verified_at`.
4. THE Credential API SHALL complete each verification request within 35 seconds; IF the external platform API does not respond within 35 seconds, THEN THE Credential API SHALL return HTTP 504.

---

### Requirement 8 — contact_sync_log and pending_contacts Tables

**User Story:** As a developer, I want dedicated tables for contact synchronisation state and staged pending contacts, so that sync operations are auditable and recoverable.

#### Acceptance Criteria

1. THE `contact_sync_log` table SHALL contain at minimum: `id` (UUID, primary key), `user_id` (UUID, foreign key referencing `auth.users.id`), `platform_name` (TEXT), `synced_at` (TIMESTAMPTZ), `records_imported` (INTEGER), `status` (TEXT, CHECK IN `('success', 'partial', 'error')`), and `error_message` (TEXT, nullable).
2. THE `pending_contacts` table SHALL contain at minimum: `id` (UUID, primary key), `user_id` (UUID, foreign key referencing `auth.users.id`), `platform_name` (TEXT), `raw_payload` (JSONB), `status` (TEXT, CHECK IN `('pending', 'imported', 'failed')`), and `created_at` (TIMESTAMPTZ, not null, default `now()`).
3. THE `contact_sync_log` table SHALL have Row-Level Security enabled with policies restricting SELECT, INSERT, UPDATE, and DELETE to rows where `user_id = auth.uid()`.
4. THE `pending_contacts` table SHALL have Row-Level Security enabled with policies restricting SELECT, INSERT, UPDATE, and DELETE to rows where `user_id = auth.uid()`.

---

### Requirement 9 — Migration: Backfill and Drop Legacy Plaintext Columns

**User Story:** As a developer, I want a safe database migration that moves existing plaintext credentials into the encrypted store and removes the legacy columns, so that no plaintext secrets remain in the database after deployment.

#### Acceptance Criteria

1. THE migration script SHALL create the `platform_credentials` table before reading from the `integrations` table.
2. WHEN the migration script runs, THE migration script SHALL read each row from `integrations` where `api_key` or `api_secret` is not null, encrypt the credential fields using the envelope encryption scheme, and insert a corresponding row into `platform_credentials` with the encrypted values.
3. THE migration script SHALL map `integrations.provider` values to `platform_credentials.platform_name` using the mapping: `'gallabox'→'gallabox'`, `'omnisend'→'omnisend'`, `'shopify'→'shopify'`, `'meta'→'meta_ads'`, `'klaviyo'→'klaviyo'`.
4. WHEN the backfill is complete, THE migration script SHALL drop the `api_key` and `api_secret` columns from the `integrations` table.
5. IF the migration script encounters an error during backfill for a specific row, THEN THE migration script SHALL log the `integrations.id` of the failing row and continue processing remaining rows rather than rolling back the entire migration.
6. THE migration script SHALL be idempotent: running it a second time SHALL NOT create duplicate rows in `platform_credentials` or raise an error if `api_key` and `api_secret` columns have already been dropped.

---

### Requirement 10 — Service Layer Integration

**User Story:** As a developer, I want platform service classes to receive decrypted credentials at call time rather than reading from environment variables, so that credentials are always sourced from the encrypted store.

#### Acceptance Criteria

1. WHEN a Credential API handler needs to call a platform service, THE Credential API SHALL decrypt the stored credential for the authenticated user, pass the decrypted values to the service factory (e.g., `createGallaboxService(overrides)` for Gallabox), and SHALL NOT fall back to environment variable credentials if no `platform_credentials` row exists for the user.
2. IF no `platform_credentials` row exists for the requested platform and authenticated user, THEN THE Credential API SHALL return HTTP 404 with a message indicating the credential has not been configured.
3. THE Credential API SHALL discard decrypted credential values from server memory after the service call completes and SHALL NOT cache plaintext credentials between requests.
