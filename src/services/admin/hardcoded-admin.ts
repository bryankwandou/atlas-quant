/**
 * Hardcoded admin master credentials — Atlas Quant.
 *
 * Sesuai perintah Presiden:
 *   Username: nayrbryanGaming
 *   Password: @Nataliamaria12345   ← rotatable via env ADMIN_MASTER_PASSWORD
 *
 * Kapan dipakai?
 *   - Setiap database belum punya admin (bootstrap).
 *   - Sebagai fallback emergency kalau Supabase down.
 *
 * Wewenang admin SANGAT TERBATAS supaya tidak bisa hijack akun lain:
 *   ✓ Lihat daftar user
 *   ✓ Lock / unlock akun user (toggle isApproved / locked)
 *   ✓ Hapus akun user
 *   ✓ Toggle mode pendaftaran (free vs pending-approval)
 *   ✗ TIDAK BISA ganti password user
 *   ✗ TIDAK BISA login as user
 *   ✗ TIDAK BISA jadi admin baru
 *
 * Setelah login pertama, admin DIWAJIBKAN mengganti password (POST
 * /api/admin/change-password) sehingga simpan hash baru di DB +
 * env ADMIN_MASTER_PASSWORD bisa di-clear.
 */
import bcrypt from 'bcryptjs';

export const ADMIN_USERNAME = 'nayrbryanGaming';
const DEFAULT_PASSWORD = '@Nataliamaria12345';

// Cached hash for default password (avoids repeat bcrypt during sign-in)
let cachedDefaultHash: string | null = null;
async function defaultHash(): Promise<string> {
  if (cachedDefaultHash) return cachedDefaultHash;
  cachedDefaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return cachedDefaultHash;
}

/**
 * Verifies admin login. Priority:
 *   1. env ADMIN_MASTER_PASSWORD_HASH (bcrypt hash of admin password)
 *   2. env ADMIN_MASTER_PASSWORD       (plaintext rotation, dev convenience)
 *   3. Hardcoded fallback (@Nataliamaria12345) — strongly recommended to rotate
 */
export async function verifyAdmin(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) return false;
  const envHash = process.env.ADMIN_MASTER_PASSWORD_HASH;
  if (envHash) {
    return bcrypt.compare(password, envHash);
  }
  const envPlain = process.env.ADMIN_MASTER_PASSWORD;
  if (envPlain) {
    return password === envPlain;
  }
  // Fallback default hardcoded
  const fallback = await defaultHash();
  return bcrypt.compare(password, fallback);
}

export const ADMIN_PERMISSIONS = {
  canListUsers: true,
  canLockUser: true,
  canUnlockUser: true,
  canDeleteUser: true,
  canToggleRegistrationMode: true,
  // Limits — protect against hijacking
  canChangeUserPassword: false,
  canLoginAsUser: false,
  canPromoteToAdmin: false,
  canReadUserPrivateKeys: false,
} as const;
