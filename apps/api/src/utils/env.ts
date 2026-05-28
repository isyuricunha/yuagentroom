export interface Env {
  DATABASE_URL: string;
  REDIS_URL: string | undefined;
  PORT: number;
  JWT_SECRET: string;
  ALLOW_REGISTRATION: boolean;
  ADMIN_PASSWORD?: string;
  CORS_ORIGINS?: string;
}

let _env: Env | null = null;

export function readEnv(): Env {
  if (_env) return _env;

  const DATABASE_URL = process.env['DATABASE_URL'] ?? 'sqlite:./data/db.sqlite';
  const REDIS_URL = process.env['REDIS_URL'];
  const rawPort = process.env['PORT'];
  const PORT = rawPort ? parseInt(rawPort, 10) : 3000;
  const JWT_SECRET = process.env['JWT_SECRET'];
  const ALLOW_REGISTRATION = process.env['ALLOW_REGISTRATION'] === 'true';
  const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];
  const CORS_ORIGINS = process.env['CORS_ORIGINS'];

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }

  if (isNaN(PORT)) {
    throw new Error(`Invalid PORT environment variable: "${rawPort}"`);
  }

  _env = { DATABASE_URL, REDIS_URL, PORT, JWT_SECRET, ALLOW_REGISTRATION, ADMIN_PASSWORD, CORS_ORIGINS };
  return _env;
}
