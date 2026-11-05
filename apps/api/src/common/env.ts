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
