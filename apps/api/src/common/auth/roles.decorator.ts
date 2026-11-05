import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** Restrict a route to roles. ADMIN always passes. e.g. `@Roles('TEACHER', 'ADMIN')` */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
