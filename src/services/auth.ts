import { supabaseAuthAdmin } from './supabase-auth';

/**
 * Creates a user profile row in public.users after Supabase Auth user creation.
 */
export async function createUserProfile(
  userId: string,
  username: string,
  email: string,
  pubkey?: string
): Promise<void> {
  const { error } = await supabaseAuthAdmin
    .from('users')
    .insert({
      id: userId,
      username,
      email,
      pubkey: pubkey ?? null,
    });

  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`);
  }
}

/**
 * Looks up the email associated with a username from public.users.
 * Returns null if the username does not exist.
 */
export async function getEmailByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabaseAuthAdmin
    .from('users')
    .select('email')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data.email as string;
}

/**
 * Checks whether a username is not yet taken in public.users.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabaseAuthAdmin
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error) return false;
  return data === null;
}

/**
 * Fetches the username associated with a Supabase Auth user id.
 * Returns null if not found.
 */
export async function getUsernameByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAuthAdmin
    .from('users')
    .select('username')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.username as string;
}
