import { CssBaseline, ThemeProvider } from "@mui/material";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";

import type { CurrentUser } from "@/api/types";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";
import { theme } from "@/theme";

export const alice: CurrentUser = {
  id: "11111111-1111-1111-1111-111111111111",
  username: "alice",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Anderson",
  fullName: "Alice Anderson",
  isStaff: false,
};

export function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: "authenticated",
    user: alice,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

interface Options extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  auth?: AuthContextValue;
}

/** Render with the theme, a memory router and a fake auth context. */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", auth = makeAuth(), ...options }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );
  }
  return { auth, ...render(ui, { wrapper: Wrapper, ...options }) };
}
