import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/client";

interface AuthContextType {
  loggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  loggedIn: false,
  setLoggedIn: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    authApi.me().then(() => setLoggedIn(true)).catch(() => setLoggedIn(false));
  }, []);

  return (
    <AuthContext.Provider value={{ loggedIn, setLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);