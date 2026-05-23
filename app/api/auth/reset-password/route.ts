import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { access_token, new_password } = body as {
      access_token?: string;
      new_password?: string;
    };

    if (!access_token) {
      return NextResponse.json({ error: 'Access token is required.' }, { status: 400 });
    }
    if (!new_password || new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create a client authenticated with the user's access token
    const client = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: { Authorization: `Bearer ${access_token}` },
      },
      auth: { persistSession: false },
    });

    const { error } = await client.auth.updateUser({ password: new_password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: unknown) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
