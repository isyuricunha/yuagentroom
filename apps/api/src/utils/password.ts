/**
 * Shared password utilities for hashing and verification.
 * Uses bcrypt for secure password hashing.
 */

/**
 * Hash a password using bcrypt.
 * @param password - The plain text password to hash
 * @returns A promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash.
 * @param password - The plain text password to verify
 * @param hash - The hashed password to compare against
 * @returns A promise resolving to true if the password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}
