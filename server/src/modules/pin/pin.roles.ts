import { UserRole } from '@prisma/client';

// Only superadmins have a PIN. They use it to sign in and to confirm
// sensitive actions; every other role works with their password alone.
export const PIN_ROLES: readonly UserRole[] = [UserRole.SUPERADMIN];
