import { SetMetadata } from '@nestjs/common';

import { UserType } from 'src/types/users';

export const ROLES_KEY = 'role';
export const Roles = (role: UserType) => SetMetadata(ROLES_KEY, role);
