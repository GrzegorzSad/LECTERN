import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { GroupList} from "./ui/group-list";
import type { Group } from "../types/types";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { Link } from "react-router-dom";
import { authApi, groupsApi } from "../api/client";

interface LayoutProps {
  children: ReactNode;
  group?: boolean;
}

export const Layout = ({ children, group = true }: LayoutProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

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
      {group && loggedIn && (
        <div className="row-start-1 row-end-3 col-start-1 border-r overflow-y-auto p-4 bg-background">
          <GroupList groups={groups} />
        </div>
      )}

      {/* Navbar */}
      <div className="row-start-1 col-start-2 border-b bg-background flex items-center px-6">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-96 p-4">
                  {!loggedIn && (
                    <li>
                      <NavigationMenuLink>
                        <Link to="/login">Login</Link>
                      </NavigationMenuLink>
                    </li>
                  )}
                  <li>
                    <NavigationMenuLink>
                      <Link to="/docs/installation">Installation</Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            {!loggedIn && (
              <NavigationMenuItem>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  <Link to="/login">Login</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Main content */}
      <div className="row-start-2 col-start-2 p-8 overflow-auto">
        {children}
      </div>
    </div>
  );
};