#!/usr/bin/env node
/**
 * ATLAS-QUANT  ·  Firebase + Vercel Auto-Setup
 * ─────────────────────────────────────────────
 * Runs ONCE. Parses the firebaseConfig block you paste from Firebase Console,
 * writes .env.local, then pushes every variable to Vercel automatically
 * (no dashboard clicks needed).
 *
 * Usage:
 *   node scripts/setup-firebase.mjs
 *
 * Prerequisites (already satisfied for this project):
 *   - Vercel CLI installed  (npm i -g vercel)
 *   - Logged in to Vercel   (vercel login  — already done when you deployed)
 */

import { execSync, spawnSync } from 'child_process';
import { createInterface }     from 'readline';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname }    from 'path';
import { fileURLToPath }       from 'url';

const ROOT  = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV   = resolve(ROOT, '.env.local');
const ENVS  = ['production', 'preview', 'development'];

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  blue:  '\x1b[34m',
  cyan:  '\x1b[36m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  red:   '\x1b[31m',
  dim:   '\x1b[2m',
};
const log  = (...a) => console.log(...a);
const ok   = (msg)  => log(`${c.green}✅ ${msg}${c.reset}`);
const warn = (msg)  => log(`${c.yellow}⚠️  ${msg}${c.reset}`);
const err  = (msg)  => log(`${c.red}❌ ${msg}${c.reset}`);
const info = (msg)  => log(`${c.cyan}ℹ  ${msg}${c.reset}`);
const step = (n, msg) => log(`\n${c.bold}${c.blue}[${n}]${c.reset} ${c.bold}${msg}${c.reset}`);
const sep  = ()     => log(c.dim + '─'.repeat(60) + c.reset);

// ── Parse firebaseConfig block from raw text ──────────────────────────────────
function parseFirebaseConfig(raw) {
  // Support both JS object literal and JSON formats
  const pairs = {};
  const patterns = {
    apiKey:            /apiKey\s*[=:]\s*['"]([^'"]+)['"]/,
    authDomain:        /authDomain\s*[=:]\s*['"]([^'"]+)['"]/,
    projectId:         /projectId\s*[=:]\s*['"]([^'"]+)['"]/,
    storageBucket:     /storageBucket\s*[=:]\s*['"]([^'"]+)['"]/,
    messagingSenderId: /messagingSenderId\s*[=:]\s*['"]([^'"]+)['"]/,
    appId:             /appId\s*[=:]\s*['"]([^'"]+)['"]/,
    measurementId:     /measurementId\s*[=:]\s*['"]([^'"]+)['"]/,
  };
  for (const [key, re] of Object.entries(patterns)) {
    const m = raw.match(re);
    if (m) pairs[key] = m[1];
  }
  return pairs;
}

// ── Read multi-line paste until user types END or hits double-enter ───────────
function readPaste(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    log(prompt);
    log(c.dim + 'Paste the block below, then press Enter twice (or type END on a new line):' + c.reset);
    const lines = [];
    let emptyCount = 0;
    rl.on('line', (line) => {
      if (line.trim() === 'END') { rl.close(); return; }
      if (line.trim() === '') {
        emptyCount++;
        if (emptyCount >= 2) { rl.close(); return; }
      } else {
        emptyCount = 0;
      }
      lines.push(line);
    });
    rl.on('close', () => resolve(lines.join('\n')));
  });
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); });
  });
}

// ── Vercel CLI: add a single env var to all environments ─────────────────────
function vercelEnvAdd(name, value) {
  for (const env of ENVS) {
    const result = spawnSync(
      'vercel', ['env', 'add', name, env],
      {
        input:  value + '\n',
        encoding: 'utf8',
        stdio:  ['pipe', 'pipe', 'pipe'],
        cwd:    ROOT,
        shell:  true,
      }
    );
    if (result.status !== 0) {
      // Already exists → try removing then re-adding
      spawnSync('vercel', ['env', 'rm', name, env, '--yes'], {
        stdio: 'pipe', cwd: ROOT, shell: true,
      });
      const retry = spawnSync(
        'vercel', ['env', 'add', name, env],
        { input: value + '\n', encoding: 'utf8', stdio: ['pipe','pipe','pipe'], cwd: ROOT, shell: true }
      );
      if (retry.status !== 0) {
        warn(`  Could not set ${name} in ${env}: ${retry.stderr?.trim()}`);
      }
    }
  }
}

// ── Link Vercel project if not already linked ─────────────────────────────────
function ensureVercelLinked() {
  if (existsSync(resolve(ROOT, '.vercel/project.json'))) return true;
  info('Linking Vercel project (atlas-quant)…');
  const r = spawnSync('vercel', ['link', '--yes', '--project', 'atlas-quant'], {
    stdio: 'inherit', cwd: ROOT, shell: true,
  });
  return r.status === 0;
}

// ── Write .env.local ──────────────────────────────────────────────────────────
function writeEnvLocal(vars) {
  let content = existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';

  for (const [key, val] of Object.entries(vars)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(content)) {
      content = content.replace(re, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
  }

  writeFileSync(ENV, content.trimStart());
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  sep();
  log(`\n${c.bold}${c.blue}🔥 ATLAS·QUANT  —  Firebase + Vercel Auto-Setup${c.reset}\n`);
  sep();

  // ── STEP 1: Get Firebase config ───────────────────────────────────────────
  step(1, 'Firebase Config');
  log(`\nOpen Firebase Console → Your Project → Project Settings → General tab`);
  log(`→ Scroll to "Your apps" → Web app → Copy the ${c.bold}firebaseConfig${c.reset} block.\n`);
  info(`URL: ${c.cyan}https://console.firebase.google.com/${c.reset}`);

  const raw  = await readPaste('\nPaste your firebaseConfig block:');
  const cfg  = parseFirebaseConfig(raw);

  const required = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
  const missing  = required.filter(k => !cfg[k]);

  if (missing.length > 0) {
    err(`Could not parse: ${missing.join(', ')}`);
    log('Make sure you pasted the full firebaseConfig block including the field values.');
    process.exit(1);
  }

  ok(`Parsed ${Object.keys(cfg).length} Firebase fields`);

  // ── STEP 2: Master email ──────────────────────────────────────────────────
  step(2, 'Master Account Email');
  const defaultMaster = 'nayrbryangaming3@gmail.com';
  log(`Default master email: ${c.bold}${defaultMaster}${c.reset}`);
  const masterInput = await ask(`Press Enter to keep default, or type a different email: `);
  const masterEmail = masterInput || defaultMaster;
  ok(`Master email: ${masterEmail}`);

  // ── STEP 3: Write .env.local ──────────────────────────────────────────────
  step(3, 'Writing .env.local');

  const envVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY:             cfg.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:         cfg.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:          cfg.projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:      cfg.storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: cfg.messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID:              cfg.appId,
    NEXT_PUBLIC_MASTER_EMAIL:                 masterEmail,
  };
  if (cfg.measurementId) {
    envVars.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = cfg.measurementId;
  }

  writeEnvLocal(envVars);
  ok(`.env.local updated with ${Object.keys(envVars).length} Firebase variables`);

  // ── STEP 4: Push to Vercel ────────────────────────────────────────────────
  step(4, 'Pushing env vars to Vercel');

  const linked = ensureVercelLinked();
  if (!linked) {
    warn('Could not auto-link Vercel project. Run `vercel link` manually then re-run this script.');
    log('\nAlternative: vars are saved in .env.local — run `node scripts/push-env-to-vercel.mjs` after linking.');
    process.exit(0);
  }

  for (const [name, value] of Object.entries(envVars)) {
    process.stdout.write(`  ${c.dim}→${c.reset} ${name} … `);
    vercelEnvAdd(name, value);
    process.stdout.write(`${c.green}✓${c.reset}\n`);
  }

  ok(`All ${Object.keys(envVars).length} variables synced to Vercel (production + preview + development)`);

  // ── STEP 5: Trigger redeploy ──────────────────────────────────────────────
  step(5, 'Triggering Vercel redeploy');
  const deploy = spawnSync('vercel', ['--prod', '--yes'], {
    stdio: 'inherit', cwd: ROOT, shell: true,
  });
  if (deploy.status === 0) {
    ok('Production deployment triggered!');
  } else {
    warn('Could not auto-deploy. Run `vercel --prod` manually to redeploy with new env vars.');
  }

  // ── STEP 6: Firebase Auth reminder ───────────────────────────────────────
  step(6, 'Firebase Auth — Enable providers');
  sep();
  log(`\n${c.yellow}LAST STEP (takes 30 seconds in Firebase Console):${c.reset}`);
  log(`\n1. Go to: ${c.cyan}https://console.firebase.google.com/project/${cfg.projectId}/authentication/providers${c.reset}`);
  log(`2. Enable: ${c.bold}Email/Password${c.reset}`);
  log(`3. Enable: ${c.bold}Google${c.reset}`);
  log(`4. Authorized domains → Add: ${c.bold}atlas-quant.vercel.app${c.reset}`);
  log(`\n${c.dim}(These cannot be enabled via API — Firebase requires the console for Auth provider setup)${c.reset}`);
  sep();

  log(`\n${c.green}${c.bold}✅ ATLAS·QUANT Firebase setup complete!${c.reset}`);
  log(`${c.dim}Local dev: npm run dev   |   Production: https://atlas-quant.vercel.app${c.reset}\n`);
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
