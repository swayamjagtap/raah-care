import { Request } from 'express';
import { UserRole } from '../../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  userId: string;
  supabaseId: string | null;
  role: UserRole;
  hospitalId: string | null;
  ambulanceId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
