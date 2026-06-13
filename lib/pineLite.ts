// ─────────────────────────────────────────────────────────────────────────────
// Pine-lite — a small, honest subset of TradingView Pine Script.
//
// NOT a full Pine v5 engine (that would need a sandboxed VM). This interprets the
// most common indicator-scripting patterns so users can prototype overlays:
//
//   • Built-in series: open, high, low, close, volume, hl2, hlc3, ohlc4
//   • Functions: sma, ema, rma, wma, rsi, atr, stdev, highest, lowest, change,
//                abs, max, min, sign, cross, crossover, crossunder
//   • Arithmetic (+ - * / %), comparisons (> < >= <= == !=), and/or, ternary ?:
//   • Variable assignment:  name = expr   (and  name := expr)
//   • plot(series, "title", color="#rrggbb", panel="main"|"sub")
//   • hline(value, "title", color="#rrggbb")
//   • color.red / color.green / color.blue / color.orange / ... constants
//   • // line comments
//
// Everything is evaluated vectorized over the whole bar history (a "series" is a
// number[]; a scalar is a number that broadcasts). Output = a list of plots the
// chart renders as line overlays (main pane) or in a dedicated "Pine" sub-pane.
// ─────────────────────────────────────────────────────────────────────────────

export interface PineInput {
  open: number[]; high: number[]; low: number[]; close: number[]; volume: number[];
}
export interface PinePlot {
  kind: 'line' | 'hline';
  title: string;
  color: string;
  panel: 'main' | 'sub';
  data: number[];   // for hline: filled constant series
  value?: number;   // for hline
}
export interface PineResult {
  plots: PinePlot[];
  error: string | null;
}

type Val = number | number[];
const isSeries = (v: Val): v is number[] => Array.isArray(v);

// ── series math helpers ──────────────────────────────────────────────────────
const NA = NaN;
function broadcast(a: Val, b: Val, n: number, f: (x: number, y: number) => number): number[] {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = isSeries(a) ? a[i] : a;
    const y = isSeries(b) ? b[i] : b;
    out[i] = f(x, y);
  }
  return out;
}
function toSeries(v: Val, n: number): number[] {
  return isSeries(v) ? v : new Array(n).fill(v);
}

function sma(src: number[], len: number): number[] {
  const n = src.length, out = new Array(n).fill(NA);
  let sum = 0, cnt = 0;
  const q: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = src[i];
    if (Number.isFinite(v)) { q.push(v); sum += v; cnt++; } else { q.push(0); }
    if (q.length > len) { sum -= q.shift()!; cnt = Math.min(cnt, len); }
    if (i >= len - 1) out[i] = sum / len;
  }
  return out;
}
function ema(src: number[], len: number): number[] {
  const n = src.length, out = new Array(n).fill(NA);
  const k = 2 / (len + 1); let prev = NA;
  for (let i = 0; i < n; i++) {
    const v = src[i];
    if (!Number.isFinite(v)) { out[i] = prev; continue; }
    prev = Number.isFinite(prev) ? v * k + prev * (1 - k) : v;
    out[i] = prev;
  }
  return out;
}
function rma(src: number[], len: number): number[] {
  const n = src.length, out = new Array(n).fill(NA);
  const k = 1 / len; let prev = NA;
  for (let i = 0; i < n; i++) {
    const v = src[i];
    if (!Number.isFinite(v)) { out[i] = prev; continue; }
    prev = Number.isFinite(prev) ? v * k + prev * (1 - k) : v;
    out[i] = prev;
  }
  return out;
}
function wma(src: number[], len: number): number[] {
  const n = src.length, out = new Array(n).fill(NA);
  const denom = (len * (len + 1)) / 2;
  for (let i = len - 1; i < n; i++) {
    let acc = 0; let ok = true;
    for (let j = 0; j < len; j++) { const v = src[i - j]; if (!Number.isFinite(v)) { ok = false; break; } acc += v * (len - j); }
    if (ok) out[i] = acc / denom;
  }
  return out;
}
function rollFn(src: number[], len: number, pick: (w: number[]) => number): number[] {
  const n = src.length, out = new Array(n).fill(NA);
  for (let i = len - 1; i < n; i++) {
    const w = src.slice(i - len + 1, i + 1).filter(Number.isFinite);
    if (w.length) out[i] = pick(w);
  }
  return out;
}
function stdev(src: number[], len: number): number[] {
  return rollFn(src, len, w => {
    const m = w.reduce((a, b) => a + b, 0) / w.length;
    return Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / w.length);
  });
}
function rsi(src: number[], len: number): number[] {
  const n = src.length, gains = new Array(n).fill(0), losses = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const d = src[i] - src[i - 1];
    gains[i] = d > 0 ? d : 0; losses[i] = d < 0 ? -d : 0;
  }
  const ag = rma(gains, len), al = rma(losses, len);
  return ag.map((g, i) => {
    const l = al[i];
    if (!Number.isFinite(g) || !Number.isFinite(l)) return NA;
    if (l === 0) return 100;
    const rs = g / l; return 100 - 100 / (1 + rs);
  });
}
function trueRange(h: number[], l: number[], c: number[]): number[] {
  const n = c.length, out = new Array(n).fill(NA);
  for (let i = 0; i < n; i++) {
    if (i === 0) { out[i] = h[i] - l[i]; continue; }
    out[i] = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
  }
  return out;
}
function change(src: number[]): number[] {
  return src.map((v, i) => (i === 0 ? NA : v - src[i - 1]));
}

// ── tokenizer ────────────────────────────────────────────────────────────────
type Tok = { t: 'num' | 'str' | 'id' | 'op' | 'punct'; v: string };
function tokenize(line: string): Tok[] {
  const toks: Tok[] = []; let i = 0;
  const ops = ['>=', '<=', '==', '!=', ':=', '&&', '||', 'and', 'or'];
  while (i < line.length) {
    const c = line[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '/' && line[i + 1] === '/') break; // comment
    if (c === '"' || c === "'") {
      let j = i + 1; let s = '';
      while (j < line.length && line[j] !== c) { s += line[j]; j++; }
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i; let s = '';
      while (j < line.length && /[0-9.]/.test(line[j])) { s += line[j]; j++; }
      toks.push({ t: 'num', v: s }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; let s = '';
      while (j < line.length && /[A-Za-z0-9_.]/.test(line[j])) { s += line[j]; j++; }
      if (s === 'and' || s === 'or') toks.push({ t: 'op', v: s });
      else toks.push({ t: 'id', v: s });
      i = j; continue;
    }
    const two = line.slice(i, i + 2);
    if (ops.includes(two)) { toks.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/%<>=?:'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    if ('(),'.includes(c)) { toks.push({ t: 'punct', v: c }); i++; continue; }
    i++; // skip unknown char
  }
  return toks;
}

// ── Pratt-style expression parser → AST ──────────────────────────────────────
type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'var'; v: string }
  | { k: 'call'; name: string; args: { name?: string; node: Node }[] }
  | { k: 'unary'; op: string; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'tern'; c: Node; a: Node; b: Node };

const BIN_PREC: Record<string, number> = {
  'or': 1, '||': 1, 'and': 2, '&&': 2,
  '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4,
  '+': 5, '-': 5, '*': 6, '/': 6, '%': 6,
};

class Parser {
  toks: Tok[]; i = 0;
  constructor(toks: Tok[]) { this.toks = toks; }
  peek() { return this.toks[this.i]; }
  next() { return this.toks[this.i++]; }
  expect(v: string) { const t = this.next(); if (!t || t.v !== v) throw new Error(`expected '${v}'`); }

  parseExpr(prec = 0): Node {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (!t || t.t !== 'op') break;
      if (t.v === '?') {
        if (prec > 0) break;
        this.next();
        const a = this.parseExpr(0); this.expect(':'); const b = this.parseExpr(0);
        left = { k: 'tern', c: left, a, b }; continue;
      }
      const p = BIN_PREC[t.v];
      if (p == null || p <= prec) break;
      this.next();
      const right = this.parseExpr(p);
      left = { k: 'bin', op: t.v, a: left, b: right };
    }
    return left;
  }
  parseUnary(): Node {
    const t = this.peek();
    if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) {
      this.next(); return { k: 'unary', op: t.v, a: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary(): Node {
    const t = this.next();
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') return { k: 'num', v: parseFloat(t.v) };
    if (t.t === 'str') return { k: 'str', v: t.v };
    if (t.t === 'punct' && t.v === '(') { const e = this.parseExpr(0); this.expect(')'); return e; }
    if (t.t === 'id') {
      if (this.peek() && this.peek().v === '(') {
        this.next();
        const args: { name?: string; node: Node }[] = [];
        if (this.peek() && this.peek().v !== ')') {
          for (;;) {
            // named arg?  ident = expr
            if (this.peek()?.t === 'id' && this.toks[this.i + 1]?.v === '=') {
              const nm = this.next().v; this.next(); args.push({ name: nm, node: this.parseExpr(0) });
            } else {
              args.push({ node: this.parseExpr(0) });
            }
            if (this.peek() && this.peek().v === ',') { this.next(); continue; }
            break;
          }
        }
        this.expect(')');
        return { k: 'call', name: t.v, args };
      }
      return { k: 'var', v: t.v };
    }
    throw new Error(`unexpected '${t.v}'`);
  }
}

const COLOR_CONST: Record<string, string> = {
  'color.red': '#f23645', 'color.green': '#089981', 'color.lime': '#00e676',
  'color.blue': '#2962ff', 'color.orange': '#ff9800', 'color.yellow': '#ffeb3b',
  'color.purple': '#9c27b0', 'color.fuchsia': '#e040fb', 'color.aqua': '#00bcd4',
  'color.teal': '#26a69a', 'color.white': '#ffffff', 'color.gray': '#787b86',
  'color.maroon': '#b71c1c', 'color.navy': '#1a237e', 'color.silver': '#bdbdbd',
};

// ── interpreter ──────────────────────────────────────────────────────────────
export function runPine(code: string, input: PineInput): PineResult {
  const n = input.close.length;
  const plots: PinePlot[] = [];
  const vars: Record<string, Val> = {};
  const hl2 = broadcast(input.high, input.low, n, (a, b) => (a + b) / 2);
  const hlc3 = input.close.map((c, i) => (input.high[i] + input.low[i] + c) / 3);
  const ohlc4 = input.close.map((c, i) => (input.open[i] + input.high[i] + input.low[i] + c) / 4);
  const builtins: Record<string, Val> = {
    open: input.open, high: input.high, low: input.low, close: input.close, volume: input.volume,
    hl2, hlc3, ohlc4, na: NA, true: 1, false: 0,
  };

  const num = (v: Val): number => (isSeries(v) ? v[v.length - 1] : v);
  const colorOf = (node?: Node): string => {
    if (!node) return '';
    if (node.k === 'str') return node.v;
    if (node.k === 'var' && COLOR_CONST[node.v]) return COLOR_CONST[node.v];
    return '';
  };

  function evalNode(node: Node): Val {
    switch (node.k) {
      case 'num': return node.v;
      case 'str': return node.v as any;
      case 'var': {
        if (node.v in vars) return vars[node.v];
        if (node.v in builtins) return builtins[node.v];
        if (COLOR_CONST[node.v]) return COLOR_CONST[node.v] as any;
        throw new Error(`unknown identifier '${node.v}'`);
      }
      case 'unary': {
        const a = evalNode(node.a);
        if (node.op === '-') return isSeries(a) ? a.map(x => -x) : -a;
        return a;
      }
      case 'bin': return evalBin(node.op, evalNode(node.a), evalNode(node.b));
      case 'tern': {
        const c = evalNode(node.c);
        // vectorized select
        const a = evalNode(node.a), b = evalNode(node.b);
        if (isSeries(c) || isSeries(a) || isSeries(b)) {
          const cs = toSeries(c, n), as = toSeries(a, n), bs = toSeries(b, n);
          return cs.map((x, i) => (x ? as[i] : bs[i]));
        }
        return c ? a : b;
      }
      case 'call': return evalCall(node);
    }
  }

  function evalBin(op: string, a: Val, b: Val): Val {
    const f: Record<string, (x: number, y: number) => number> = {
      '+': (x, y) => x + y, '-': (x, y) => x - y, '*': (x, y) => x * y,
      '/': (x, y) => x / y, '%': (x, y) => x % y,
      '>': (x, y) => (x > y ? 1 : 0), '<': (x, y) => (x < y ? 1 : 0),
      '>=': (x, y) => (x >= y ? 1 : 0), '<=': (x, y) => (x <= y ? 1 : 0),
      '==': (x, y) => (x === y ? 1 : 0), '!=': (x, y) => (x !== y ? 1 : 0),
      'and': (x, y) => (x && y ? 1 : 0), '&&': (x, y) => (x && y ? 1 : 0),
      'or': (x, y) => (x || y ? 1 : 0), '||': (x, y) => (x || y ? 1 : 0),
    };
    const fn = f[op]; if (!fn) throw new Error(`bad operator '${op}'`);
    if (!isSeries(a) && !isSeries(b)) return fn(a, b);
    return broadcast(a, b, n, fn);
  }

  function arg(node: { k: string } | Node, name: string, idx: number, args: { name?: string; node: Node }[]): Node | undefined {
    const named = args.find(x => x.name === name);
    if (named) return named.node;
    const positional = args.filter(x => !x.name);
    return positional[idx]?.node;
  }

  function evalCall(node: Extract<Node, { k: 'call' }>): Val {
    const a = node.args;
    const ev = (i: number) => evalNode(a.filter(x => !x.name)[i].node);
    const s = (i: number) => toSeries(ev(i), n);
    const len = (i: number) => Math.max(1, Math.round(num(ev(i))));
    switch (node.name) {
      case 'sma': case 'ta.sma': return sma(s(0), len(1));
      case 'ema': case 'ta.ema': return ema(s(0), len(1));
      case 'rma': case 'ta.rma': return rma(s(0), len(1));
      case 'wma': case 'ta.wma': return wma(s(0), len(1));
      case 'rsi': case 'ta.rsi': return rsi(s(0), len(1));
      case 'stdev': case 'ta.stdev': return stdev(s(0), len(1));
      case 'atr': case 'ta.atr': return rma(trueRange(input.high, input.low, input.close), len(0));
      case 'tr': case 'ta.tr': return trueRange(input.high, input.low, input.close);
      case 'highest': case 'ta.highest': return rollFn(s(0), len(1), w => Math.max(...w));
      case 'lowest': case 'ta.lowest': return rollFn(s(0), len(1), w => Math.min(...w));
      case 'change': case 'ta.change': return change(s(0));
      case 'abs': case 'math.abs': { const v = ev(0); return isSeries(v) ? v.map(Math.abs) : Math.abs(v); }
      case 'sign': case 'math.sign': { const v = ev(0); return isSeries(v) ? v.map(Math.sign) : Math.sign(v); }
      case 'max': case 'math.max': return broadcast(ev(0), ev(1), n, Math.max);
      case 'min': case 'math.min': return broadcast(ev(0), ev(1), n, Math.min);
      case 'cross': case 'ta.cross': case 'crossover': case 'ta.crossover':
      case 'crossunder': case 'ta.crossunder': {
        const x = s(0), y = s(1);
        const over = node.name.includes('over');
        const under = node.name.includes('under');
        return x.map((xv, i) => {
          if (i === 0) return 0;
          const up = x[i - 1] <= y[i - 1] && xv > y[i];
          const dn = x[i - 1] >= y[i - 1] && xv < y[i];
          if (over) return up ? 1 : 0;
          if (under) return dn ? 1 : 0;
          return up || dn ? 1 : 0;
        });
      }
      case 'plot': {
        const data = s(0);
        const title = (() => { const t = arg(node, 'title', 1, a); return t && t.k === 'str' ? t.v : `plot ${plots.length + 1}`; })();
        const color = colorOf(arg(node, 'color', 2, a)) || '#2962ff';
        const panelNode = arg(node, 'panel', 3, a);
        const panel = (panelNode && panelNode.k === 'str' && panelNode.v === 'sub') ? 'sub' : 'main';
        plots.push({ kind: 'line', title, color, panel, data });
        return NA;
      }
      case 'hline': {
        const value = num(ev(0));
        const title = (() => { const t = arg(node, 'title', 1, a); return t && t.k === 'str' ? t.v : `hline ${value}`; })();
        const color = colorOf(arg(node, 'color', 2, a)) || '#787b86';
        plots.push({ kind: 'hline', title, color, panel: 'sub', value, data: new Array(n).fill(value) });
        return NA;
      }
      // no-ops we tolerate so common scripts don't error out
      case 'indicator': case 'study': case 'strategy': case 'plotshape':
      case 'fill': case 'bgcolor': case 'barcolor': case 'input': case 'input.int':
      case 'input.float': case 'input.bool': case 'input.source':
        return node.args.length ? evalNode(node.args[0].node) : NA;
      default:
        throw new Error(`unsupported function '${node.name}'`);
    }
  }

  try {
    const lines = code.split('\n');
    for (let ln = 0; ln < lines.length; ln++) {
      const raw = lines[ln];
      const line = raw.replace(/\/\/.*$/, '').trim();
      if (!line || line.startsWith('//')) continue;
      // version pragma / annotations
      if (line.startsWith('@') || line.startsWith('//@')) continue;
      // assignment?  name = expr   |   name := expr   |   var name = expr
      const m = line.match(/^(?:var\s+|varip\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*:?=\s*(.+)$/);
      if (m && !['plot', 'hline', 'indicator', 'study', 'strategy'].includes(m[1])) {
        const toks = tokenize(m[2]);
        if (!toks.length) continue;
        const ast = new Parser(toks).parseExpr(0);
        vars[m[1]] = evalNode(ast);
        continue;
      }
      // bare expression / function call (plot, hline, …)
      const toks = tokenize(line);
      if (!toks.length) continue;
      const ast = new Parser(toks).parseExpr(0);
      evalNode(ast);
    }
    if (!plots.length) return { plots, error: 'No plot() call produced output. Add e.g. plot(ema(close,21)).' };
    return { plots, error: null };
  } catch (e: any) {
    return { plots, error: e?.message ? String(e.message) : 'Pine parse error' };
  }
}

export const PINE_EXAMPLE = `//@version=5
indicator("My EMA Ribbon", overlay=true)
fast = ema(close, 9)
slow = ema(close, 21)
plot(fast, "EMA 9", color=color.aqua)
plot(slow, "EMA 21", color=color.orange)

// momentum in a sub-pane:
r = rsi(close, 14)
plot(r, "RSI", color=color.purple, panel="sub")
hline(70, "OB", color=color.red)
hline(30, "OS", color=color.green)`;
