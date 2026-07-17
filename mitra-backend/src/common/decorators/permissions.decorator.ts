import { SetMetadata } from '@nestjs/common';

/**
 * Fine-grained permission decorator.
 * Example: @Permissions('project:approve', 'design:release')
 */
export const Permissions = (...permissions: string[]) => SetMetadata('permissions', permissions);
