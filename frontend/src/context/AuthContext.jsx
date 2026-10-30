import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { api, setTokenProvider } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { isLoaded: isClerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useClerkAuth();
  const clerk = useClerk();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('campus_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Fail-safe timeout: never allow Clerk or network lag to hang on loading screen for > 2.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for suspension events triggered by API responses across the app
  useEffect(() => {
    const handleSuspended = (e) => {
      console.warn('[AuthContext] Received suspension notification:', e.detail);
      setUser(prev => ({
        ...(prev || {}),
        isBanned: true,
        email: prev?.email || localStorage.getItem('campus_user_email') || ''
      }));
      setAuthError('Your account has been suspended by an administrator.');
    };
    window.addEventListener('campus_user_suspended', handleSuspended);
    return () => window.removeEventListener('campus_user_suspended', handleSuspended);
  }, []);

  // Set the token provider: prefer backend-issued campus_token, fallback to Clerk JWT
  useEffect(() => {
    setTokenProvider(async () => {
      const localToken = localStorage.getItem('campus_token');
      if (localToken) {
        return localToken;
      }
      if (isSignedIn && getToken) {
        try {
          const clerkToken = await getToken();
          if (clerkToken) return clerkToken;
        } catch (e) {
          console.warn("Could not fetch Clerk auth token:", e);
        }
      }
      return null;
    });
  }, [isSignedIn, getToken]);

  // Sync Clerk User with our Backend
  useEffect(() => {
    const syncUser = async () => {
      if (isSignedIn && clerkUser) {
        const email = clerkUser.primaryEmailAddress?.emailAddress?.trim().toLowerCase();

        // Strict University Domain Guard
        if (email && !email.endsWith('@thapar.edu')) {
          setAuthError(`Access Denied: "${email}" is not an authorized @thapar.edu address. Only official Thapar University accounts are permitted.`);
          setUser(null);
          setToken(null);
          localStorage.removeItem('campus_token');
          if (clerk) {
            try {
              await clerk.signOut();
            } catch (e) {
              console.warn("Clerk signout notice:", e);
            }
          }
          setLoading(false);
          return;
        }

        // Clear old cached token if switching users on the same device/browser
        const storedEmail = localStorage.getItem('campus_user_email');
        if (storedEmail && email && storedEmail !== email) {
          localStorage.removeItem('campus_token');
          localStorage.removeItem('campus_user_email');
          setToken(null);
          setUser(null);
        }

        // Only show loading if user is not already set (prevents flashing on re-syncs)
        if (!user) setLoading(true);

        try {
          if (email) {
            setAuthError('');
            console.log('[AuthContext] syncUser – calling syncClerkUser for:', email);
            const syncPayload = {
              email,
              fullName: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
              clerkId: clerkUser.id
            };
            let data;
            try {
              data = await api.syncClerkUser(syncPayload);
            } catch (err) {
              if (err.status !== 401) throw err;
              // A saved campus_token that expired or was signed with a rotated secret must not end
              // a valid Clerk session: drop it and retry, which sends the Clerk token instead.
              localStorage.removeItem('campus_token');
              setToken(null);
              data = await api.syncClerkUser(syncPayload);
            }
            console.log('[AuthContext] syncUser – syncClerkUser returned:', { userId: data.user?.id, role: data.user?.role, tokenPresent: !!data.token, tokenLength: data.token?.length });
            setUser(data.user);
            if (data.token) {
              localStorage.setItem('campus_token', data.token);
              localStorage.setItem('campus_user_email', email);
              setToken(data.token);
              console.log('[AuthContext] syncUser – campus_token STORED in localStorage');
            } else {
              console.warn('[AuthContext] syncUser – NO token in response!');
            }
          }
        } catch (err) {
          console.error("[AuthContext] syncUser – FAILED:", err.message);
          const isSuspended = err.isBanned || err.message?.toLowerCase().includes("suspended") || err.message?.toLowerCase().includes("banned");
          if (isSuspended) {
            setUser({ email, isBanned: true, role: 'STUDENT' });
            setAuthError("Your account has been suspended by an administrator.");
          } else {
            setAuthError(err.message || "Failed to initialize university profile.");
            setUser(null);
            if (clerk) {
              try {
                await clerk.signOut();
              } catch (e) {}
            }
          }
          localStorage.removeItem('campus_token');
          localStorage.removeItem('campus_user_email');
        }
      } else if (!isSignedIn && isClerkLoaded) {
        // Fallback to local token check if exists
        const localToken = localStorage.getItem('campus_token');
        if (localToken) {
          if (!user) setLoading(true);
          try {
            const data = await api.getMe();
            setUser(data.user);
          } catch (e) {
            if (e.isBanned || e.message?.toLowerCase().includes("suspended") || e.message?.toLowerCase().includes("banned")) {
              const storedEmail = localStorage.getItem('campus_user_email');
              setUser({ email: storedEmail, isBanned: true, role: 'STUDENT' });
            } else {
              logout();
            }
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    };

    if (isClerkLoaded) {
      syncUser();
    }
  }, [isClerkLoaded, isSignedIn, clerkUser]);

  const login = async (email, password) => {
    try {
      const data = await api.login({ email, password });
      localStorage.setItem('campus_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      if (err.isBanned || err.message?.toLowerCase().includes("suspended") || err.message?.toLowerCase().includes("banned")) {
        setAuthError("Your account has been suspended by an administrator.");
        setUser({ email, isBanned: true, role: 'STUDENT' });
      }
      throw err;
    }
  };

  const signup = async (email, password, otp) => {
    const data = await api.signup({ email, password, otp });
    localStorage.setItem('campus_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const onboardStudent = async (profileData) => {
    const currentToken = localStorage.getItem('campus_token');
    console.log('[AuthContext] onboardStudent called – campus_token present:', !!currentToken, 'length:', currentToken?.length);
    
    try {
      const res = await api.onboardStudent(profileData);
      const refreshed = await api.getMe();
      setUser(refreshed.user);
      return res;
    } catch (err) {
      // If 401, try to re-sync and get a fresh campus_token, then retry once
      if (err.message?.includes('session token') || err.message?.includes('401') || err.message?.includes('Access denied') || err.message?.includes('expired')) {
        console.log('[AuthContext] onboardStudent – got auth error, re-syncing token...');
        const email = clerkUser?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
        if (email && isSignedIn) {
          try {
            const syncData = await api.syncClerkUser({
              email,
              fullName: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
              clerkId: clerkUser.id
            });
            if (syncData.token) {
              localStorage.setItem('campus_token', syncData.token);
              localStorage.setItem('campus_user_email', email);
              setToken(syncData.token);
              console.log('[AuthContext] onboardStudent – token re-synced, retrying...');
              const res = await api.onboardStudent(profileData);
              const refreshed = await api.getMe();
              setUser(refreshed.user);
              return res;
            }
          } catch (syncErr) {
            console.error('[AuthContext] onboardStudent – re-sync also failed:', syncErr.message);
          }
        }
      }
      throw err;
    }
  };

  const onboardTeacher = async (profileData) => {
    const res = await api.onboardTeacher(profileData);
    const refreshed = await api.getMe();
    setUser(refreshed.user);
    return res;
  };

  const logout = async () => {
    if (isSignedIn && clerk) {
      try {
        await clerk.signOut();
      } catch (e) {
        console.warn("Clerk signout notice:", e);
      }
    }
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_user_email');
    setToken(null);
    setUser(null);
    setAuthError('');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading: loading,
        authError,
        setAuthError,
        login,
        signup,
        onboardStudent,
        onboardTeacher,
        logout,
        setUser,
        isSignedIn,
        clerkUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
