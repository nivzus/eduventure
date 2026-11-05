import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Marks a route/controller as not requiring auth. The JwtAuthGuard still
 * parses a valid token if present, so `@CurrentUser()` may be defined.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
