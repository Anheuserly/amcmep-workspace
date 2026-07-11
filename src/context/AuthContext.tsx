"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { ID, type Models } from "appwrite";
import { appwrite } from "@/lib/appwrite/client";
import {
  clearCurrentSession,
  clearStoredProfileSession,
  ensureAnonymousSession,
  linkEmailClientProfile,
  loadStoredProfileSession,
} from "@/lib/services/authServices";
import { fetchClientProfile, readString, readStringArray } from "@/lib/services/appwriteServices";
import type { UserProfile, UserRole } from "@/types";

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  profile: UserProfile | null;
  session: Models.Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRole: UserRole;
  roles: UserRole[];
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, referrerId?: string) => Promise<void>;
  logout: () => Promise<void>;
  createGuestSession: () => Promise<void>;
  completeQrProfileSession: (profile: UserProfile) => void;
  switchRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function guestProfile(user?: Models.User<Models.Preferences> | null): UserProfile {
  const now = new Date().toISOString();
  return {
    $id: user?.$id ?? "guest",
    userId: user?.$id ?? "guest",
    customerId: "",
    name: "Guest",
    email: "",
    phone: "",
    avatar: "",
    city: "",
    state: "",
    country: "India",
    roles: ["guest"],
    activeRole: "guest",
    preferredLanguage: "en",
    createdAt: user?.$createdAt ?? now,
    updatedAt: user?.$updatedAt ?? now,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    activeRole: "guest",
    roles: ["guest"],
  });

  const refreshProfile = useCallback(async () => {
    try {
      const user = await appwrite.account.get();
      if (!user.email) {
        const stored = loadStoredProfileSession();
        if (stored?.profile) {
          setState((prev) => ({
            ...prev,
            user,
            profile: stored.profile,
            isAuthenticated: true,
            activeRole: stored.profile.activeRole,
            roles: stored.profile.roles,
            isLoading: false,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          user,
          profile: guestProfile(user),
          isAuthenticated: true,
          activeRole: "guest",
          roles: ["guest"],
          isLoading: false,
        }));
        return;
      }
      const clientProfile = await fetchClientProfile(user.$id);
      const clientRoles = readStringArray(clientProfile ?? {}, "roles") as UserRole[];
      const roles: UserRole[] = clientRoles.length
        ? clientRoles
        : user.prefs?.roles?.length
        ? user.prefs.roles
        : ["customer"];
      const activeRole =
        (readString(clientProfile ?? {}, "activeRole") as UserRole) ||
        (user.prefs?.activeRole as UserRole) ||
        roles[0];

      const profile: UserProfile = {
        $id: clientProfile?.$id ?? user.$id,
        userId: user.$id,
        customerId: readString(clientProfile ?? {}, "customerId"),
        name: readString(clientProfile ?? {}, "name") || user.name || user.prefs?.name || "User",
        email: readString(clientProfile ?? {}, "email") || user.email,
        phone: readString(clientProfile ?? {}, "phone") || user.phone,
        avatar: readString(clientProfile ?? {}, "profileImage") || user.prefs?.avatar,
        city: readString(clientProfile ?? {}, "city"),
        state: readString(clientProfile ?? {}, "state"),
        country: readString(clientProfile ?? {}, "country") || "India",
        roles,
        activeRole,
        referralCode:
          user.prefs?.referralCode ||
          readString(clientProfile ?? {}, "referralCode") ||
          buildReferralCode(readString(clientProfile ?? {}, "customerId") || user.$id),
        preferredLanguage: readString(clientProfile ?? {}, "language") || user.prefs?.preferredLanguage || "en",
        createdAt: readString(clientProfile ?? {}, "createdAt") || user.$createdAt,
        updatedAt: readString(clientProfile ?? {}, "updatedAt") || user.$updatedAt,
      };

      setState((prev) => ({
        ...prev,
        user,
        profile,
        isAuthenticated: true,
        activeRole,
        roles,
        isLoading: false,
      }));
    } catch {
      try {
        await ensureAnonymousSession();
        const user = await appwrite.account.get();
        setState((prev) => ({
          ...prev,
          user,
          profile: guestProfile(user),
          isAuthenticated: true,
          activeRole: "guest",
          roles: ["guest"],
          isLoading: false,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          user: null,
          profile: guestProfile(null),
          isLoading: false,
          isAuthenticated: true,
          activeRole: "guest",
          roles: ["guest"],
        }));
      }
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      clearStoredProfileSession();
      await clearCurrentSession();
      await appwrite.account.createEmailPasswordSession(email, password);
      const user = await appwrite.account.get();
      await linkEmailClientProfile({ accountId: user.$id, email: user.email, name: user.name });
      await refreshProfile();
    },
    [refreshProfile]
  );

  const register = useCallback(
    async (email: string, password: string, name: string, referrerId?: string) => {
      clearStoredProfileSession();
      await clearCurrentSession();
      await appwrite.account.create(ID.unique(), email, password, name);
      await appwrite.account.createEmailPasswordSession(email, password);
      await appwrite.account.updatePrefs({
        name,
        roles: ["customer"],
        activeRole: "customer",
        preferredLanguage: "en",
      });
      const user = await appwrite.account.get();
      await linkEmailClientProfile({
        accountId: user.$id,
        email: user.email,
        name,
        referrerId,
      });
      await refreshProfile();
    },
    [refreshProfile]
  );

  const logout = useCallback(async () => {
    clearStoredProfileSession();
    await clearCurrentSession();
    setState({
      user: null,
      profile: guestProfile(null),
      session: null,
      isLoading: false,
      isAuthenticated: true,
      activeRole: "guest",
      roles: ["guest"],
    });
  }, []);

  const createGuestSession = useCallback(async () => {
    clearStoredProfileSession();
    await clearCurrentSession();
    await ensureAnonymousSession();
    try {
      await appwrite.account.updatePrefs({
        roles: ["guest"],
        activeRole: "guest",
      });
    } catch {}
    const user = await appwrite.account.get().catch(() => null);
    setState((prev) => ({
      ...prev,
      user,
      profile: guestProfile(user),
      session: null,
      isLoading: false,
      isAuthenticated: true,
      activeRole: "guest",
      roles: ["guest"],
    }));
  }, []);

  const completeQrProfileSession = useCallback((profile: UserProfile) => {
    setState((prev) => ({
      ...prev,
      profile,
      isAuthenticated: true,
      activeRole: profile.activeRole,
      roles: profile.roles,
      isLoading: false,
    }));
  }, []);

  const switchRole = useCallback(
    (role: UserRole) => {
      if (state.roles.includes(role)) {
        setState((prev) => ({ ...prev, activeRole: role }));
      }
    },
    [state.roles]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        createGuestSession,
        completeQrProfileSession,
        switchRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function buildReferralCode(seed: string) {
  const cleaned = seed.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `AMC${cleaned.slice(-6) || "MEP247"}`;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
