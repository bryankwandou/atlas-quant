import { NextResponse } from 'next/server';
import { supabaseAuthAdmin } from '@/src/services/supabase-auth';

export async function POST() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY,
      username text UNIQUE NOT NULL,
      email text NOT NULL,
      pubkey text,
      role text DEFAULT 'user',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
  `;

  try {
    await supabaseAuthAdmin.rpc('exec_sql', { query: sql });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
