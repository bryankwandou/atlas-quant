import { NextResponse } from 'next/server';

/**
 * GET /api/ai/kb
 * Browse the local AI knowledge base. No auth, no external dependencies.
 * Useful for verifying that the local LLM runs entirely from this repo.
 */
export async function GET() {
  const { KNOWLEDGE_BASE, kbCount } = await import('@/src/ai/local/knowledgeBase');
  return NextResponse.json({
    engine: 'atlas-local-llm',
    version: 'v1',
    total: kbCount(),
    entries: KNOWLEDGE_BASE.map((e) => ({
      id: e.id,
      title: e.title,
      tags: e.tags,
      bias: e.bias,
      variantCount: e.variants.length,
      bulletCount: e.bullets.length,
      patternKeys: Object.keys(e.pattern),
    })),
  });
}
