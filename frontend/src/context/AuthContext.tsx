import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/client";
import type { User } from "../types/types";

interface AuthContextType {
  loggedIn: boolean;
  user: User | null;
  userLoading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  loggedIn: false,
  user: null,
  userLoading: true,
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u as User))
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ loggedIn: user !== null, user, userLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);