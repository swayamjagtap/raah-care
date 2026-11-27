import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, authApi } from '@raah/api-client';
import type { AuthenticatedUserProfile } from '@raah/shared-types';
import { AuthContext, AuthState } from './authContextInstance';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AuthenticatedUserProfile | null>(null);
  const [authState, setAuthState] = useState<AuthState>(AuthState.INITIALIZING);
  const [error, setError] = useState<Error | null>(null);

  const requestIdRef = useRef(0);

  /**
   * Authoritative profile resolver.
   * Uses sequence IDs to prevent out-of-order race conditions from overwriting newer state.
   */
  const resolveProfileForSession = useCallback(async (activeSession: Session | null) => {
    const reqId = ++requestIdRef.current;

    if (!activeSession) {
      setSession(null);
      setSupabaseUser(null);
      setProfile(null);
      setAuthState(AuthState.UNAUTHENTICATED);
      setError(null);
      return;
    }

    setSession(activeSession);
    setSupabaseUser(activeSession.user ?? null);

    try {
      const userProfile = await authApi.getMe();
      if (reqId !== requestIdRef.current) return;

      setProfile(userProfile);
      setAuthState(AuthState.AUTHENTICATED_LINKED);
      setError(null);
    } catch (err: any) {
      if (reqId !== requestIdRef.current) return;

      if (err.statusCode === 401) {
        // Confirmed Supabase identity, but no linked user in RAAH DB
        setProfile(null);
        setAuthState(AuthState.AUTHENTICATED_UNLINKED);
        setError(null);
      } else {
        // Backend unavailable or network error
        setProfile(null);
        setAuthState(AuthState.AUTH_ERROR);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, []);

  useEffect(() => {
    // Single authoritative Supabase auth state listener.
    // Handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, and TOKEN_REFRESHED.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      await resolveProfileForSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveProfileForSession]);

  const signInWithPassword = async (email: string, password: string) => {
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError);
      throw signInError;
    }

    // Await profile resolution immediately so callers receive up-to-date state
    if (data.session) {
      await resolveProfileForSession(data.session);
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    setError(null);
    const patientAppUrl =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PATIENT_APP_URL) ||
      (typeof window !== 'undefined' ? window.location.origin : '');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: patientAppUrl ? `${patientAppUrl}/register` : undefined,
      },
    });

    if (signUpError) {
      setError(signUpError);
      throw signUpError;
    }

    if (!data.session) {
      setAuthState(AuthState.EMAIL_CONFIRMATION_PENDING);
    } else {
      await resolveProfileForSession(data.session);
    }

    return { session: data.session, user: data.user };
  };

  const signOut = async () => {
    ++requestIdRef.current; // Cancel any in-flight profile requests
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signout network errors
    } finally {
      setSession(null);
      setSupabaseUser(null);
      setProfile(null);
      setAuthState(AuthState.UNAUTHENTICATED);
      setError(null);
    }
  };

  const clearSession = async () => {
    await signOut();
  };

  const refreshProfile = useCallback(async () => {
    if (session) {
      await resolveProfileForSession(session);
    }
  }, [session, resolveProfileForSession]);

  const setEmailConfirmationPending = useCallback((pending: boolean) => {
    if (pending) {
      setAuthState(AuthState.EMAIL_CONFIRMATION_PENDING);
    } else if (authState === AuthState.EMAIL_CONFIRMATION_PENDING) {
      setAuthState(session ? AuthState.AUTHENTICATED_UNLINKED : AuthState.UNAUTHENTICATED);
    }
  }, [authState, session]);

  const isLoading = authState === AuthState.INITIALIZING;
  const needsRegistration = authState === AuthState.AUTHENTICATED_UNLINKED;
  const emailConfirmationPending = authState === AuthState.EMAIL_CONFIRMATION_PENDING;

  const value = useMemo(
    () => ({
      session,
      supabaseUser,
      profile,
      isLoading,
      authState,
      error,
      needsRegistration,
      emailConfirmationPending,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      clearSession,
      refreshProfile,
      setEmailConfirmationPending,
    }),
    [
      session,
      supabaseUser,
      profile,
      isLoading,
      authState,
      error,
      needsRegistration,
      emailConfirmationPending,
      refreshProfile,
      setEmailConfirmationPending,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
