import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import * as authApi from "@/api/auth";
import { onUnauthorized } from "@/api/client";
import type { CurrentUser } from "@/api/types";

import { AuthContext, type AuthContextValue, type AuthStatus } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    authApi.hasStoredSession() ? "loading" : "anonymous",
  );

  // Restore the session from the stored refresh token on first load.
  useEffect(() => {
    if (status !== "loading") return;
    let active = true;
    authApi
      .fetchCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (active) setStatus("anonymous");
      });
    return () => {
      active = false;
    };
  }, [status]);

  // The API client reports when the refresh token stops working.
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setStatus("anonymous");
      }),
    [],
  );

  const login = useCallback(async (username: string, password: string) => {
    await authApi.login(username, password);
    setUser(await authApi.fetchCurrentUser());
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
