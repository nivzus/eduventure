import { Role } from '@prisma/client';

/** The authenticated user attached to `request.user` by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const isStaff = (u?: AuthUser | null): boolean => !!u && (u.role === 'TEACHER' || u.role === 'ADMIN');
export const isAdmin = (u?: AuthUser | null): boolean => !!u && u.role === 'ADMIN';
