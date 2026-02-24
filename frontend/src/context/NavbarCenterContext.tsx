import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface NavbarCenterContextType {
  center: ReactNode;
  setCenter: (content: ReactNode) => void;
}

const NavbarCenterContext = createContext<NavbarCenterContextType>({
  center: null,
  setCenter: () => {},
});

export const NavbarCenterProvider = ({ children }: { children: ReactNode }) => {
  const [center, setCenter] = useState<ReactNode>(null);

  return (
    <NavbarCenterContext.Provider value={{ center, setCenter }}>
      {children}
    </NavbarCenterContext.Provider>
  );
};

export const useNavbarCenter = () => useContext(NavbarCenterContext);