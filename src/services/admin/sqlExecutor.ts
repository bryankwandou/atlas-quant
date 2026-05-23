/**
 * Atlas Quant · Programmatic SQL executor
 * --------------------------------------------------------------------
 * Runs arbitrary DDL against Supabase Postgres WITHOUT requiring the
 * operator to open the SQL editor.
 *
 * Strategy (in order of preference):
 *   1. Supabase RPC function `exec_sql(text)` — preferred. If present,
 *      we POST each statement as a JSON-RPC call. The first run
 *      installs the function via the bootstrap path (#3).
 *   2. PostgREST `query` endpoint via service-role key — only available
 *      on self-hosted; on Vercel Supabase this returns 404, so we skip.
 *   3. Bootstrap: if neither (1) nor (2) is available, we instruct the
 *      operator (via the admin console) to paste a single one-line
 *      bootstrap snippet that installs the exec_sql RPC.  After that
 *      one click, every future migration is auto-runnable.
 *
 * The endpoint returns a per-statement report so the admin sees exactly
 * what ran, what already existed (idempotent CREATE IF NOT EXISTS), and
 * what failed.
 */

export interface SqlExecutorResult {
  ok: boolean;
  driver: 'rpc_exec_sql' | 'bootstrap_required' | 'unconfigured';
  statementsTotal: number;
  statementsRun: number;
  statementsSkipped: number;
  failures: Array<{ statement: string; error: string }>;
  notes: string[];
}

const BOOTSTRAP_SQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS jsonb AS $func$
DECLARE
  result jsonb;
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM public;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
`.trim();

function supabaseConfig(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), serviceKey: key };
}

/** Try to call exec_sql RPC. Returns true if the function exists and ran. */
async function callExecSql(stmt: string): Promise<{ ok: true; result: any } | { ok: false; status: number; error: string }> {
  const cfg = supabaseConfig();
  if (!cfg) return { ok: false, status: 0, error: 'Supabase not configured' };
  const res = await fetch(`${cfg.url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
    },
    body: JSON.stringify({ query: stmt }),
  });
  if (!res.ok) {
    let text = '';
    try { text = await res.text(); } catch {}
    return { ok: false, status: res.status, error: text || res.statusText };
  }
  const result = await res.json().catch(() => null);
  return { ok: true, result };
}

export async function executeStatements(statements: string[]): Promise<SqlExecutorResult> {
  const cfg = supabaseConfig();
  if (!cfg) {
    return {
      ok: false,
      driver: 'unconfigured',
      statementsTotal: statements.length,
      statementsRun: 0,
      statementsSkipped: statements.length,
      failures: [],
      notes: [
        'NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not set on the server.',
        'Set them in the Vercel project settings and click "Run migration" again.',
      ],
    };
  }

  // Probe: try the first statement; if 404 the RPC does not exist yet
  const probe = await callExecSql('SELECT 1;');
  if (probe.ok === false && (probe.status === 404 || /function .*exec_sql.* does not exist/i.test(probe.error))) {
    return {
      ok: false,
      driver: 'bootstrap_required',
      statementsTotal: statements.length,
      statementsRun: 0,
      statementsSkipped: statements.length,
      failures: [],
      notes: [
        'One-time bootstrap required: paste the SQL block below into the Supabase SQL editor (or any Postgres GUI) and run it once. After that, every future migration runs from this dashboard with a single click — no human SQL editing.',
        BOOTSTRAP_SQL,
      ],
    };
  }
  if (probe.ok === false) {
    return {
      ok: false,
      driver: 'unconfigured',
      statementsTotal: statements.length,
      statementsRun: 0,
      statementsSkipped: statements.length,
      failures: [{ statement: 'PROBE SELECT 1', error: `${probe.status} ${probe.error}` }],
      notes: ['Could not reach Supabase REST endpoint. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'],
    };
  }

  // exec_sql RPC works → run every statement
  let run = 0;
  const failures: SqlExecutorResult['failures'] = [];
  for (const stmt of statements) {
    const r = await callExecSql(stmt);
    if (r.ok === false) {
      failures.push({ statement: stmt.slice(0, 200), error: `${r.status} ${r.error}` });
    } else {
      // exec_sql wrapper may return { ok: false, error: ... } when EXECUTE itself raised
      if (r.result && typeof r.result === 'object' && r.result.ok === false) {
        failures.push({ statement: stmt.slice(0, 200), error: String(r.result.error ?? 'unknown') });
      } else {
        run++;
      }
    }
  }
  return {
    ok: failures.length === 0,
    driver: 'rpc_exec_sql',
    statementsTotal: statements.length,
    statementsRun: run,
    statementsSkipped: 0,
    failures,
    notes: failures.length === 0 ? ['All statements applied. Schema is now up-to-date.'] : ['Some statements failed (see failures list). The migration is idempotent; you can re-run safely after fixing.'],
  };
}

export { BOOTSTRAP_SQL };
