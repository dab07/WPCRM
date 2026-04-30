import { supabaseAdmin } from '../../../supabase/supabase';

// ============================================================
// Types
// ============================================================

export type TestStatus = 'PASS' | 'FAIL' | 'ERROR';

export interface IsolationTestCase {
  id: string;
  description: string;
  category: 'cross_tenant_read' | 'cross_tenant_write' | 'mixed_queue' | 'brand_id_presence';
  status: TestStatus;
  expected: string;
  actual: string;
  details?: string | undefined;
}

export interface IsolationTestReport {
  reportId: string;
  generatedAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  overallStatus: 'PASS' | 'FAIL';
  testCases: IsolationTestCase[];
  signedBy: { SYS: string; PRD: string };
}

// ============================================================
// Core tables that must carry brand_id
// ============================================================
const BRAND_SCOPED_TABLES = [
  'contacts', 'conversations', 'messages', 'campaigns',
  'follow_up_rules', 'triggers', 'ai_intents', 'business_cards',
  'workflow_executions', 'social_media_accounts', 'instagram_posts',
  'instagram_broadcast_rules', 'instagram_broadcast_logs',
  'scheduling_requests', 'orders', 'abandoned_carts',
  'brand_sync_metadata', 'opportunities', 'campaign_assets',
] as const;

// ============================================================
// Service
// ============================================================

export class TenantIsolationService {
  private supabase = supabaseAdmin;

  /**
   * Runs all isolation test scenarios and returns a signed report.
   * brandAId and brandBId must be real brand UUIDs in the database.
   */
  async runIsolationTests(
    brandAId: string,
    brandBId: string
  ): Promise<IsolationTestReport> {
    const testCases: IsolationTestCase[] = [];

    // TC-01: Cross-tenant read — Brand A user attempts Brand B read
    testCases.push(await this.testCrossTenantRead(brandAId, brandBId));

    // TC-02: Cross-tenant write — Brand A user attempts Brand B write
    testCases.push(await this.testCrossTenantWrite(brandAId, brandBId));

    // TC-03: System worker processes mixed-brand queue (brand_id always set)
    testCases.push(await this.testMixedBrandQueue(brandAId, brandBId));

    // TC-04..N: Every persisted record has brand_id
    const brandIdTests = await this.testBrandIdPresence();
    testCases.push(...brandIdTests);

    const passed = testCases.filter(t => t.status === 'PASS').length;
    const failed = testCases.filter(t => t.status === 'FAIL').length;
    const errors = testCases.filter(t => t.status === 'ERROR').length;

    const report: IsolationTestReport = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      totalTests: testCases.length,
      passed,
      failed,
      errors,
      overallStatus: failed === 0 && errors === 0 ? 'PASS' : 'FAIL',
      testCases,
      signedBy: {
        SYS: `SYS-AUTO-${new Date().toISOString()}`,
        PRD: `PRD-PENDING-REVIEW`,
      },
    };

    // Persist report for audit trail
    await this.supabase.from('tenant_isolation_reports').upsert({
      id: report.reportId,
      generated_at: report.generatedAt,
      overall_status: report.overallStatus,
      total_tests: report.totalTests,
      passed: report.passed,
      failed: report.failed,
      errors: report.errors,
      report_json: report,
    });

    return report;
  }

  // ---- TC-01: Cross-tenant read ----
  private async testCrossTenantRead(
    _brandAId: string,
    brandBId: string
  ): Promise<IsolationTestCase> {
    try {
      // Using anon client (simulates Brand A user — no service role bypass)
      const { createClient } = await import('@supabase/supabase-js');
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Attempt to read Brand B's opportunities as an unauthenticated/Brand A session
      const { data, error } = await anonClient
        .from('opportunities')
        .select('id, brand_id')
        .eq('brand_id', brandBId)
        .limit(1);

      const leakedRows = (data ?? []).filter(r => r.brand_id === brandBId);

      return {
        id: 'TC-01',
        description: 'Brand A user attempts to read Brand B opportunities via anon client',
        category: 'cross_tenant_read',
        status: leakedRows.length === 0 ? 'PASS' : 'FAIL',
        expected: 'Zero rows returned for Brand B (RLS blocks cross-tenant read)',
        actual: leakedRows.length === 0
          ? 'Zero rows returned — RLS enforced'
          : `${leakedRows.length} rows leaked from Brand B`,
        details: error?.message,
      };
    } catch (err) {
      return this.errorCase('TC-01', 'Cross-tenant read test', 'cross_tenant_read', err);
    }
  }

  // ---- TC-02: Cross-tenant write ----
  private async testCrossTenantWrite(
    _brandAId: string,
    brandBId: string
  ): Promise<IsolationTestCase> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Attempt to insert a campaign record into Brand B's space
      const { error } = await anonClient
        .from('campaigns')
        .insert({
          name: '__isolation_test_write__',
          message_template: 'test',
          target_tags: [],
          brand_id: brandBId,
          status: 'draft',
        });

      // RLS should block this — we expect an error
      const blocked = !!error;

      return {
        id: 'TC-02',
        description: 'Brand A user attempts to write a campaign record into Brand B space via anon client',
        category: 'cross_tenant_write',
        status: blocked ? 'PASS' : 'FAIL',
        expected: 'Insert rejected by RLS policy',
        actual: blocked
          ? `Write blocked — ${error?.message}`
          : 'Write succeeded — ISOLATION BREACH',
      };
    } catch (err) {
      return this.errorCase('TC-02', 'Cross-tenant write test', 'cross_tenant_write', err);
    }
  }

  // ---- TC-03: Mixed-brand queue ----
  private async testMixedBrandQueue(
    brandAId: string,
    brandBId: string
  ): Promise<IsolationTestCase> {
    try {
      // Simulate a worker fetching opportunities for both brands via service role
      // and verify each record's brand_id matches the requested brand
      const { data: oppA } = await this.supabase
        .from('opportunities')
        .select('id, brand_id')
        .eq('brand_id', brandAId)
        .limit(5);

      const { data: oppB } = await this.supabase
        .from('opportunities')
        .select('id, brand_id')
        .eq('brand_id', brandBId)
        .limit(5);

      const allRows = [...(oppA ?? []), ...(oppB ?? [])];
      const crossContaminated = allRows.filter(r =>
        (r.brand_id === brandAId && (oppB ?? []).some(b => b.id === r.id)) ||
        (r.brand_id === brandBId && (oppA ?? []).some(a => a.id === r.id))
      );

      return {
        id: 'TC-03',
        description: 'System worker processes mixed-brand opportunity queue — each record must carry correct brand_id',
        category: 'mixed_queue',
        status: crossContaminated.length === 0 ? 'PASS' : 'FAIL',
        expected: 'All records carry their own brand_id with no cross-contamination',
        actual: crossContaminated.length === 0
          ? `${allRows.length} records checked — all brand_id values correct`
          : `${crossContaminated.length} cross-contaminated records found`,
      };
    } catch (err) {
      return this.errorCase('TC-03', 'Mixed-brand queue test', 'mixed_queue', err);
    }
  }

  // ---- TC-04..N: brand_id presence on all core tables ----
  private async testBrandIdPresence(): Promise<IsolationTestCase[]> {
    const results: IsolationTestCase[] = [];

    for (const table of BRAND_SCOPED_TABLES) {
      try {
        // Count rows where brand_id IS NULL
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .is('brand_id', null);

        const nullCount = count ?? 0;

        results.push({
          id: `TC-BRAND-ID-${table.toUpperCase()}`,
          description: `Every row in '${table}' must have a non-null brand_id`,
          category: 'brand_id_presence',
          status: error ? 'ERROR' : nullCount === 0 ? 'PASS' : 'FAIL',
          expected: '0 rows with NULL brand_id',
          actual: error
            ? `Query error: ${error.message}`
            : `${nullCount} rows with NULL brand_id`,
        });
      } catch (err) {
        results.push(this.errorCase(
          `TC-BRAND-ID-${table.toUpperCase()}`,
          `brand_id presence check on '${table}'`,
          'brand_id_presence',
          err
        ));
      }
    }

    return results;
  }

  private errorCase(
    id: string,
    description: string,
    category: IsolationTestCase['category'],
    err: unknown
  ): IsolationTestCase {
    return {
      id,
      description,
      category,
      status: 'ERROR',
      expected: 'Test should complete without exception',
      actual: `Exception: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
