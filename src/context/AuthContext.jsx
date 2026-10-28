import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { loginBusSync, logoutBusSync } from '../lib/busSync';
import { getProvisionedUsers } from '../utils/masterLogisticData';

const AuthContext = createContext({});
const STORAGE_KEY = 'esa_live_session_user_2026';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser({ id: parsed.user_id || 'live-user', phone: parsed.phone });
        setProfile(parsed);
      }
    } catch (err) {
      console.error('Session restore error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithPhoneAndPin = async (phoneInput, pinInput) => {
    const cleanPhone = String(phoneInput).trim().toLowerCase();
    const cleanPin = String(pinInput).trim();

    const roster = getProvisionedUsers();
    let matchedUser = roster.find((u) => String(u.phone).trim().toLowerCase() === cleanPhone || String(u.user_id).trim().toLowerCase() === cleanPhone);

    if (!matchedUser && isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', cleanPhone)
          .maybeSingle();
        if (data) matchedUser = data;
      } catch {
        // ignore
      }
    }

    if (!matchedUser) {
      throw new Error('Mobile number not found in Alina Event 2026 Roster. Contact Udit Sharma (8780675140).');
    }

    const syncSession = await loginBusSync(cleanPhone, cleanPin);
    const normalizedUser = {
      ...matchedUser,
      role: syncSession.profile.role,
      bus_no: syncSession.profile.bus_no ?? matchedUser.bus_no,
      bus_sync_token: syncSession.access_token,
      bus_sync_expires_at: syncSession.expires_at
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
    setUser({ id: normalizedUser.user_id || 'live-user', phone: normalizedUser.phone });
    setProfile(normalizedUser);
    return normalizedUser;
  };

  const signOut = async () => {
    const accessToken = profile?.bus_sync_token;
    if (accessToken) {
      try {
        await logoutBusSync(accessToken);
      } catch (error) {
        console.error('Unable to revoke bus sync session during sign out:', error);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!profile,
        loginWithPhoneAndPin,
        setProfile,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
