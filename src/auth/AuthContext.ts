// Split from AuthProvider.tsx for the reason theme/PathThemeContext.ts is
// split from theme/PathThemeProvider.tsx: a module that exports both a
// component and a non-component breaks Fast Refresh (react/only-export-components).
import { createContext } from "react";

export interface AuthContextValue {
  userId: string | null;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
