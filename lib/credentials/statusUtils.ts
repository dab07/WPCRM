/**
 * Credential status utilities for the Settings page.
 *
 * Derives the display status of a platform credential from two data points:
 *   1. Whether a `platform_credentials` row exists for the user + platform pair.
 *   2. Whether `last_verified_at` has been set (i.e., a successful live-connection
 *      test has been run at least once).
 *
 * This is a pure module — no side effects, no imports of external modules.
 */

/**
 * The three mutually-exclusive connection states shown on the Settings page.
 *
 * - `'not_configured'` — no credential row exists yet.
 * - `'configured'`    — a credential row exists but has never been verified.
 * - `'verified'`      — a credential row exists and was successfully verified.
 */
export type CredentialStatus = 'not_configured' | 'configured' | 'verified';

/**
 * Derives the {@link CredentialStatus} for a single platform credential.
 *
 * Decision table:
 * | rowExists | lastVerifiedAt | result          |
 * |-----------|----------------|-----------------|
 * | false     | any            | 'not_configured'|
 * | true      | null           | 'configured'    |
 * | true      | non-null       | 'verified'      |
 *
 * @param rowExists     `true` when a `platform_credentials` row exists for the
 *                      current user and platform.
 * @param lastVerifiedAt The ISO-8601 timestamp of the last successful connection
 *                       test, or `null` if the credential has never been verified.
 * @returns The derived {@link CredentialStatus}.
 */
export function deriveStatus(
  rowExists: boolean,
  lastVerifiedAt: string | null
): CredentialStatus {
  if (!rowExists) return 'not_configured';
  if (!lastVerifiedAt) return 'configured';
  return 'verified';
}
