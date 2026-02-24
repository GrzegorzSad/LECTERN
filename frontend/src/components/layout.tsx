import type { ReactNode } from "react";
import { GroupList } from "./ui/group-list";
import { Card } from "./ui/card";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { Link } from "react-router-dom";
import { useDarkMode } from "../hooks/useDarkMode";
import { NavbarCenterProvider, useNavbarCenter } from "../context/NavbarCenterContext";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupsContext";

interface LayoutProps {
  children: ReactNode;
  showGroup?: boolean;
}

const LayoutInner = ({ children, showGroup = true }: LayoutProps) => {
  const { isDark, toggle } = useDarkMode();
  const { center } = useNavbarCenter();
  const { loggedIn } = useAuth();
  const { groups } = useGroups();

  const hasSidebar = showGroup && loggedIn;

  return (
    <div className="h-screen grid grid-rows-[64px_1fr] grid-cols-[240px_1fr]">
      {hasSidebar && (
        <div className="row-start-1 row-end-3 col-start-1 overflow-y-auto pt-4 p-2 bg-background">
          <Card className="p-2">
            <GroupList groups={groups} />
          </Card>
        </div>
      )}

      <div
        className={`row-start-1 ${hasSidebar ? "col-start-2" : "col-start-1 col-span-2"} bg-background flex items-center mx-2 pt-8`}
      >
        <Card className="flex w-full px-4">
          <div className="flex grow items-center justify-between">
            <h1>LECTERN</h1>

            <div className="flex-1 flex justify-center">
              {center}
            </div>

            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                {!loggedIn && (
                  <>
                    <NavigationMenuItem>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Link to="/login">Login</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Link to="/register">Register</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </>
                )}
                {loggedIn && (
                  <>
                    <NavigationMenuItem>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Link to="/user/:id">My Account</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Link to="/logout">Logout</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </>
                )}
                <NavigationMenuItem>
                  <NavigationMenuLink
                    className={navigationMenuTriggerStyle()}
                    onClick={toggle}
                    style={{ cursor: "pointer" }}
                  >
                    {isDark ? "☀️ Light" : "🌙 Dark"}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </Card>
      </div>

      <div
        className={`row-start-2 ${hasSidebar ? "col-start-2" : "col-start-1 col-span-2"} pt-8 mx-2 overflow-auto`}
      >
        {children}
      </div>
    </div>
  );
};

export const Layout = (props: LayoutProps) => (
  <NavbarCenterProvider>
    <LayoutInner {...props} />
  </NavbarCenterProvider>
);