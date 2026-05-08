import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

const fetchUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to load user_profile:', error);
    return null;
  }
  return data;
};

const buildUser = (sessionUser, profile) => {
  if (!sessionUser) return null;
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    ...(profile || {}),
  };
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const mountedRef = useRef(true);

  const applySession = useCallback(async (session) => {
    if (!mountedRef.current) return;
    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    const profile = await fetchUserProfile(session.user.id);
    if (!mountedRef.current) return;
    setUser(buildUser(session.user, profile));
    setIsAuthenticated(true);
    setAuthError(null);
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoadingAuth(true);

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('getSession failed:', error);
        if (!mountedRef.current) return;
        setAuthError({ type: 'unknown', message: error.message });
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      applySession(data?.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      mountedRef.current = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [applySession]);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setAuthError({ type: 'unknown', message: error.message });
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    await applySession(data?.session ?? null);
  }, [applySession]);

  const logout = useCallback(async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      navigate('/login');
    }
  }, [navigate]);

  const navigateToLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const checkAppState = useCallback(async () => {
    await checkUserAuth();
  }, [checkUserAuth]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authChecked,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
