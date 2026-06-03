#!/usr/bin/env node
/**
 * ATLAS-QUANT — Auto-push .env.local to Vercel
 *
 * Usage: node push-env-to-vercel.js [VERCEL_TOKEN]
 *
 * If no token arg: tries VERCEL_TOKEN env var, then Vercel CLI auth.
 *
 * What it does:
 * 1. Reads all keys from .env.local
 * 2. Pushes each to Vercel via API (production + preview + development)
 * 3. Triggers a new deployment
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ── Config ────────────────────────────────────────────────────
const PROJECT_ID = 'prj_nlqhwmDseNx2dVSZWKO6CFnxGvIn';
const TEAM_ID    = 'team_6SkUC46GbnKXPHFbnns0dxaL';
const ENV_FILE   = path.join(__dirname, '.env.local');

// Keys that should be PUBLIC (NEXT_PUBLIC_* prefix) are already handled
// by their name. All others are server-side only.
const SKIP_KEYS = []; // Add any keys to skip

// ── Load .env.local ───────────────────────────────────────────
function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error('❌ .env.local not found at:', filePath);
        process.exit(1);
    }
    const vars = {};
    for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const i = line.indexOf('=');
        if (i <= 0) continue;
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        if (k && v) vars[k] = v;
    }
    return vars;
}

// ── Get Vercel token ──────────────────────────────────────────
function getToken() {
    // 1. Command line arg
    const arg = process.argv[2];
    if (arg && arg.length > 10 && !arg.startsWith('-')) return arg;

    // 2. Environment variable
    if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;

    // 3. Vercel CLI token from local config
    const authFiles = [
        path.join(process.env.APPDATA || '', '../Local/vercel/auth.json'),
        path.join(process.env.HOME || process.env.USERPROFILE || '', '.vercel/auth.json'),
    ];
    for (const f of authFiles) {
        try {
            if (fs.existsSync(f)) {
                const auth = JSON.parse(fs.readFileSync(f, 'utf8'));
                if (auth.token) { console.log('✓ Using Vercel CLI token'); return auth.token; }
            }
        } catch {}
    }

    console.error('❌ No Vercel token found!');
    console.error('');
    console.error('Options:');
    console.error('  1. node push-env-to-vercel.js YOUR_TOKEN_HERE');
    console.error('  2. set VERCEL_TOKEN=your_token && node push-env-to-vercel.js');
    console.error('  3. Install Vercel CLI: npm i -g vercel && vercel login');
    console.error('');
    console.error('Get token: https://vercel.com/account/tokens');
    process.exit(1);
}

// ── Vercel API call ────────────────────────────────────────────
function vercelApi(method, endpoint, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'api.vercel.com',
            path: endpoint + (TEAM_ID ? `?teamId=${TEAM_ID}` : ''),
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            },
        };
        const req = https.request(opts, res => {
            let out = '';
            res.on('data', c => out += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(out) }); }
                catch { resolve({ status: res.statusCode, body: out }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
    console.log('');
    console.log('🚀 ATLAS-QUANT — Push env vars to Vercel');
    console.log('━'.repeat(50));

    const token = getToken();
    const envVars = loadEnvFile(ENV_FILE);
    const entries = Object.entries(envVars).filter(([k]) => !SKIP_KEYS.includes(k));

    console.log(`✓ Loaded ${entries.length} variables from .env.local`);
    console.log(`✓ Target: ${PROJECT_ID}`);
    console.log('');

    let pushed = 0, skipped = 0, failed = 0;

    for (const [key, value] of entries) {
        // Determine target environments
        const isPublic = key.startsWith('NEXT_PUBLIC_');
        const targets = ['production', 'preview', 'development'];

        process.stdout.write(`  → ${key.slice(0, 40).padEnd(40)} `);

        // Try to create, if conflict (409) then update
        const body = {
            key,
            value,
            target: targets,
            type: isPublic ? 'plain' : 'encrypted',
        };

        const res = await vercelApi(
            'POST',
            `/v10/projects/${PROJECT_ID}/env`,
            body,
            token
        );

        if (res.status === 200 || res.status === 201) {
            console.log('✅');
            pushed++;
        } else if (res.status === 409 || (res.body?.error?.code === 'ENV_ALREADY_EXISTS')) {
            // Key exists — update it
            // Get the env var ID first
            const listRes = await vercelApi('GET', `/v10/projects/${PROJECT_ID}/env`, null, token);
            const envs = listRes.body?.envs ?? [];
            const existing = envs.find(e => e.key === key && e.target?.includes('production'));

            if (existing?.id) {
                const updateRes = await vercelApi(
                    'PATCH',
                    `/v10/projects/${PROJECT_ID}/env/${existing.id}`,
                    { value, target: targets },
                    token
                );
                if (updateRes.status === 200 || updateRes.status === 201) {
                    console.log('🔄 updated');
                    pushed++;
                } else {
                    console.log(`⚠️  update failed (${updateRes.status})`);
                    skipped++;
                }
            } else {
                console.log('⚠️  exists, skip');
                skipped++;
            }
        } else {
            console.log(`❌ (${res.status}) ${JSON.stringify(res.body?.error?.message ?? '').slice(0, 60)}`);
            failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('');
    console.log('━'.repeat(50));
    console.log(`✅ Pushed: ${pushed}   🔄 Skipped: ${skipped}   ❌ Failed: ${failed}`);

    if (pushed > 0) {
        console.log('');
        console.log('🔄 Triggering new deployment...');
        const deployRes = await vercelApi(
            'POST',
            `/v13/deployments`,
            {
                name: 'atlas-quant',
                project: PROJECT_ID,
                gitSource: { type: 'github', repoId: null },
            },
            token
        );

        // If git-based deploy fails, just notify user to redeploy manually
        console.log('');
        console.log('✅ DONE! Environment variables pushed to Vercel.');
        console.log('');
        console.log('⚡ To apply changes, redeploy via:');
        console.log('   Option A: Push any commit to GitHub → auto-deploy');
        console.log('   Option B: vercel --prod (if Vercel CLI installed)');
        console.log('   Option C: Vercel Dashboard → Deployments → Redeploy');
        console.log('');
        console.log('🔑 Keys pushed:');
        entries.forEach(([k]) => console.log(`   • ${k}`));
    }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
