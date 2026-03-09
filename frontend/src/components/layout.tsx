import type { ReactNode } from "react";
import { GroupList } from "./group-list";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "./navigation-menu";
import { Link } from "react-router-dom";
import { useDarkMode } from "../hooks/useDarkMode";
import {
  NavbarCenterProvider,
  useNavbarCenter,
} from "../context/NavbarCenterContext";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupsContext";
import { SidebarProvider, SidebarInset } from "./sidebar";
import { Outlet } from "react-router-dom";

interface LayoutProps {
  showGroup?: boolean;
}

const LayoutInner = ({ showGroup = true }: LayoutProps) => {
  const { isDark, toggle } = useDarkMode();
  const { center, title } = useNavbarCenter();
  const { loggedIn, user, userLoading } = useAuth();
  const { groups } = useGroups();

  const hasSidebar = showGroup && loggedIn;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar */}
        {hasSidebar && <GroupList groups={groups} />}

        {/* Right side */}
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Navbar */}
          <div className="flex items-center p-2 bg-background shrink-0">
            <div className="flex grow items-center justify-between">
              <h1 className="font-bold w-40 overflow-hidden truncate">
                {title}
              </h1>
              <div className="flex-1 flex justify-center pe-20">{center}</div>

              <NavigationMenu>
                <NavigationMenuList className="gap-2">
                  {!userLoading && !loggedIn && (
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
                  {!userLoading && loggedIn && user && (
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        className={navigationMenuTriggerStyle()}
                      >
                        <Link to={`/user/${user.id}`}>{user.name}</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  )}
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                      onClick={toggle}
                      style={{ cursor: "pointer" }}
                    >
                      {isDark ? "☀️" : "🌙"}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-auto"><Outlet /></div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export const Layout = (props: LayoutProps) => (
  <NavbarCenterProvider>
    <LayoutInner {...props} />
  </NavbarCenterProvider>
);
