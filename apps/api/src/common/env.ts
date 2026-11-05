import { resolve } from 'node:path';

export const env = {
  get accessSecret(): string {
    return process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
  },
  get refreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
  },
  get geminiKey(): string | undefined {
    return process.env.GEMINI_API_KEY || undefined;
  },
  get isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  },
};

/** Absolute path of the upload directory (env UPLOAD_DIR, default ./uploads). */
export function uploadDir(): string {
  return resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
}

/**
 * Fail fast in production when the configuration is unsafe or incomplete.
 * Called once from main.ts before the app starts.
 */
export function assertProductionEnv(): void {
  if (!env.isProd) return;
  const problems: string[] = [];
  const weak = (v: string | undefined) => !v || v.length < 32 || /change-me|dev-|secret$/i.test(v);
  if (weak(process.env.JWT_ACCESS_SECRET)) problems.push('JWT_ACCESS_SECRET must be a random string of 32+ characters');
  if (weak(process.env.JWT_REFRESH_SECRET)) problems.push('JWT_REFRESH_SECRET must be a random string of 32+ characters');
  if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }
  if (!process.env.DATABASE_URL) problems.push('DATABASE_URL is required');
  if (!process.env.WEB_ORIGIN) problems.push('WEB_ORIGIN is required (the public URL of the web app)');
  if (problems.length) {
    throw new Error(`Unsafe production configuration:\n  - ${problems.join('\n  - ')}\nGenerate secrets with: openssl rand -base64 48`);
  }
}
