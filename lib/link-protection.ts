/**
 * Link Protection helper (A3)
 * Generates protected short-link tokens stored in Supabase.
 */
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';

interface GenerateLinkOptions {
  originalUrl: string;
  tagId?: string;
  password?: string;
  createdBy: string;
}

/**
 * Create a protected (or unprotected) redirect link.
 * Returns the full redirect URL: https://yourdomain.com/r/{token}
 */
export async function generateProtectedLink({
  originalUrl,
  tagId,
  password,
  createdBy,
}: GenerateLinkOptions): Promise<string> {
  const token = randomBytes(24).toString('hex');
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const supabase = await createClient();
  const { error } = await supabase.from('protected_links').insert({
    token,
    original_url: originalUrl,
    tag_id: tagId ?? null,
    is_protected: !!password,
    password_hash: passwordHash,
    created_by: createdBy,
  });

  if (error) throw error;

  // The base URL for links
  const base = 'https://onetap-charm.com';
  return `${base}/r/${token}`;
}
