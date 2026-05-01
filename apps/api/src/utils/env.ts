export interface Env {
  DATABASE_URL: string;
  REDIS_URL: string | undefined;
  PORT: number;
  JWT_SECRET: string;
  ALLOW_REGISTRATION: boolean;
  ADMIN_PASSWORD?: string;
}

let _env: Env | null = null;

export function readEnv(): Env {
  if (_env) return _env;

  const DATABASE_URL = process.env['DATABASE_URL'] ?? 'sqlite:./data/db.sqlite';
  const REDIS_URL = process.env['REDIS_URL'];
  const rawPort = process.env['PORT'];
  const PORT = rawPort ? parseInt(rawPort, 10) : 3000;
  const JWT_SECRET = process.env['JWT_SECRET'] ?? 'super-secret-agentroom-key-998877';
  const ALLOW_REGISTRATION = process.env['ALLOW_REGISTRATION'] === 'true';
  const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];

  if (isNaN(PORT)) {
    throw new Error(`Invalid PORT environment variable: "${rawPort}"`);
  }

  _env = { DATABASE_URL, REDIS_URL, PORT, JWT_SECRET, ALLOW_REGISTRATION, ADMIN_PASSWORD };
  return _env;
}
