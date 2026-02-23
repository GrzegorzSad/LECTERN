import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { GroupList } from "./ui/group-list";
import type { Group } from "../types/types";
import { Card } from "./ui/card";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  //   NavigationMenuTrigger,
  //   NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { Link } from "react-router-dom";
import { authApi, groupsApi } from "../api/client";
import { useDarkMode } from "../hooks/useDarkMode";

interface LayoutProps {
  children: ReactNode;
  showGroup?: boolean;
}

export const Layout = ({ children, showGroup = true }: LayoutProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const { isDark, toggle } = useDarkMode();

  useEffect(() => {
    const init = async () => {
      try {
        await authApi.me();
        setLoggedIn(true);
        const data = await groupsApi.getAll();
        setGroups(data);
      } catch {
        setLoggedIn(false);
      }
    };
    init();
  }, []);

  return (
    <div className="h-screen grid grid-rows-[64px_1fr] grid-cols-[240px_1fr]">
      {/* Sidebar */}
      {showGroup && loggedIn && (
        <div className="row-start-1 row-end-3 col-start-1 overflow-y-auto p-4 bg-background">
          <Card className="p-2">
            <GroupList groups={groups} />
          </Card>
        </div>
      )}

      {/* Navbar */}
      <div className="row-start-1 bg-background flex items-center pt-8">
        <Card className="flex flex-grow-1 items-center">
          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              <NavigationMenuItem>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <Link to="/">Home</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              {!loggedIn && (
                <>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                    >
                      <Link to="/login">Login</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                    >
                      <Link to="/register">Register</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </>
              )}
              {loggedIn && (
                <>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                    >
                      <Link to="/user/:id">My Account</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                    >
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
        </Card>
      </div>

      {/* Main content */}
      <div className="row-start-2 col-start-2 pt-8 overflow-auto">
        {children}
      </div>
    </div>
  );
};
