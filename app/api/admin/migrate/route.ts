import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';
import { ATLAS_SCHEMA_SQL, splitStatements } from '@/src/services/admin/schema';
import { executeStatements, BOOTSTRAP_SQL } from '@/src/services/admin/sqlExecutor';

/**
 * GET  /api/admin/migrate    Returns schema preview + bootstrap SQL.
 * POST /api/admin/migrate    Runs the schema migration end-to-end via
 *                            the exec_sql RPC.
 *
 * Admin-session required (cookie). No CRON_SECRET query-string trick.
 */
export async function GET() {
  const s = await verifyAdminSession();
  if (!s.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const stmts = splitStatements(ATLAS_SCHEMA_SQL);
  return NextResponse.json({
    statementCount: stmts.length,
    bootstrapSql: BOOTSTRAP_SQL,
    preview: stmts.slice(0, 6).map((s) => s.split('\n')[0]),
  });
}

export async function POST() {
  const s = await verifyAdminSession();
  if (!s.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const stmts = splitStatements(ATLAS_SCHEMA_SQL);
  const result = await executeStatements(stmts);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
