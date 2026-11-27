import { createContext } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthenticatedUserProfile } from '@raah/shared-types';

export const AuthState = {
  INITIALIZING: 'INITIALIZING',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  EMAIL_CONFIRMATION_PENDING: 'EMAIL_CONFIRMATION_PENDING',
  AUTHENTICATED_UNLINKED: 'AUTHENTICATED_UNLINKED',
  AUTHENTICATED_LINKED: 'AUTHENTICATED_LINKED',
  AUTH_ERROR: 'AUTH_ERROR',
} as const;

export type AuthState = (typeof AuthState)[keyof typeof AuthState];

export interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: AuthenticatedUserProfile | null;
  isLoading: boolean;
  authState: AuthState;
  error: Error | null;
  needsRegistration: boolean;
  emailConfirmationPending: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ session: Session | null; user: SupabaseUser | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearSession: () => Promise<void>;
  setEmailConfirmationPending: (pending: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
