export interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: {
    raah_role?: string;
    [key: string]: unknown;
  };
  user_metadata?: Record<string, unknown>;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}
