import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface NavbarCenterContextType {
  center: ReactNode;
  setCenter: (content: ReactNode) => void;
  title: string | null;
  setTitle: (title: string | null) => void;
}


const NavbarCenterContext = createContext<NavbarCenterContextType>({
  center: null,
  setCenter: () => {},
  title: null,
  setTitle: () => {},
});


export const NavbarCenterProvider = ({ children }: { children: ReactNode }) => {
  const [center, setCenter] = useState<ReactNode>(null);
  const [title, setTitle] = useState<string | null>(null);

  return (
    <NavbarCenterContext.Provider value={{ center, setCenter, title, setTitle }}>
      {children}
    </NavbarCenterContext.Provider>
  );
};

export const useNavbarCenter = () => useContext(NavbarCenterContext);
