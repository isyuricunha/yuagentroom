export interface Env {
  DATABASE_URL: string;
  REDIS_URL: string | undefined;
  PORT: number;
}

let _env: Env | null = null;

export function readEnv(): Env {
  if (_env) return _env;

  const DATABASE_URL = process.env['DATABASE_URL'] ?? 'sqlite:./data/db.sqlite';
  const REDIS_URL = process.env['REDIS_URL'];
  const rawPort = process.env['PORT'];
  const PORT = rawPort ? parseInt(rawPort, 10) : 3000;

  if (isNaN(PORT)) {
    throw new Error(`Invalid PORT environment variable: "${rawPort}"`);
  }

  _env = { DATABASE_URL, REDIS_URL, PORT };
  return _env;
}
