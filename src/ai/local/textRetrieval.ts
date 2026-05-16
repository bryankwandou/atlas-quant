/**
 * Atlas Quant · Local TF-IDF text retriever for free-form Q&A
 * --------------------------------------------------------------------
 * Indexes every KBEntry into a TF-IDF vector built from
 * `title + tags + variants + bullets`. At query time we compute the
 * same vector for the user's question and rank entries by cosine
 * similarity. Pure JS, no external API, no model download.
 */

import { KNOWLEDGE_BASE, type KBEntry } from './knowledgeBase';

const STOP_WORDS = new Set([
  'the','a','an','of','to','in','for','on','and','or','but','is','are','be','been',
  'this','that','it','as','at','by','with','from','into','than','then','what','which',
  'how','why','when','where','who','i','my','me','we','our','you','your','they','their',
  'do','does','did','have','has','had','can','could','should','would','will','if','so','not',
  'about','over','under','up','down','out','off','more','less','some','any','all','no',
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

interface DocVector {
  entry: KBEntry;
  tf: Map<string, number>;
  norm: number;
}

let INDEX: DocVector[] | null = null;
let IDF: Map<string, number> | null = null;

function ensureIndex(): { docs: DocVector[]; idf: Map<string, number> } {
  if (INDEX && IDF) return { docs: INDEX, idf: IDF };
  // Build doc-term matrix
  const docs: DocVector[] = [];
  const df = new Map<string, number>();
  for (const entry of KNOWLEDGE_BASE) {
    const corpus = [
      entry.title,
      entry.tags.join(' '),
      entry.variants.join(' '),
      entry.bullets.join(' '),
      entry.risk.join(' '),
    ].join(' ');
    const toks = tokenize(corpus);
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    docs.push({ entry, tf, norm: 0 });
    const seen = new Set<string>();
    for (const t of toks) {
      if (seen.has(t)) continue;
      seen.add(t);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const N = docs.length;
  const idf = new Map<string, number>();
  for (const [t, count] of df.entries()) {
    idf.set(t, Math.log((N + 1) / (count + 1)) + 1);
  }
  // Norm each doc
  for (const d of docs) {
    let sumSq = 0;
    for (const [t, f] of d.tf) {
      const w = f * (idf.get(t) ?? 0);
      sumSq += w * w;
    }
    d.norm = Math.sqrt(sumSq) || 1;
  }
  INDEX = docs;
  IDF = idf;
  return { docs, idf };
}

export interface TextHit {
  entry: KBEntry;
  similarity: number;
}

export function searchKnowledge(query: string, topK = 4): TextHit[] {
  const { docs, idf } = ensureIndex();
  const toks = tokenize(query);
  if (toks.length === 0) return [];
  const qTf = new Map<string, number>();
  for (const t of toks) qTf.set(t, (qTf.get(t) ?? 0) + 1);
  let qNormSq = 0;
  const qWeights = new Map<string, number>();
  for (const [t, f] of qTf) {
    const w = f * (idf.get(t) ?? 0);
    qWeights.set(t, w);
    qNormSq += w * w;
  }
  const qNorm = Math.sqrt(qNormSq) || 1;

  const hits: TextHit[] = [];
  for (const d of docs) {
    let dot = 0;
    for (const [t, qw] of qWeights) {
      const df = d.tf.get(t);
      if (!df) continue;
      const dw = df * (idf.get(t) ?? 0);
      dot += qw * dw;
    }
    if (dot <= 0) continue;
    const sim = dot / (qNorm * d.norm);
    hits.push({ entry: d.entry, similarity: sim });
  }
  hits.sort((a, b) => b.similarity - a.similarity);
  return hits.slice(0, topK);
}
