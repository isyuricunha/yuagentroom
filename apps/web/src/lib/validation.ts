import { PASSWORD_MIN_LENGTH } from './auth-constants';

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email';
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username.trim()) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (!/^[a-zA-Z0-9_@.]+$/.test(username))
    return 'Username can only contain letters, numbers, underscores, @ and dots';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < PASSWORD_MIN_LENGTH)
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  return null;
}

export function validateIdentifier(identifier: string): string | null {
  if (!identifier.trim()) return 'Username or email is required';
  if (identifier.includes('@')) {
    return validateEmail(identifier);
  } else {
    return validateUsername(identifier);
  }
}