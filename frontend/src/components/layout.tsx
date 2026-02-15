// Layout.tsx
import type { ReactNode } from "react"
import { GroupList, type Group } from "./ui/group-list"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu"
import { Link } from "react-router-dom"

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const groups: Group[] = [
    { id: "1", title: "Math", imageUrl: "https://picsum.photos/200" },
    { id: "2", title: "Physics", imageUrl: "https://picsum.photos/201" },
  ]

  return (
    <div className="h-screen grid grid-rows-[64px_1fr] grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <div className="row-start-1 row-end-3 col-start-1 border-r overflow-y-auto p-4 bg-background">
        <GroupList groups={groups} />
      </div>

      {/* Navbar */}
      <div className="row-start-1 col-start-2 border-b bg-background flex items-center px-6">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-96 p-4">
                  <li>
                    <NavigationMenuLink>
                      <Link to="/login">Login</Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink>
                      <Link to="/docs/installation">Installation</Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                <Link to="/docs">Docs</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Main content */}
      <div className="row-start-2 col-start-2 p-8 overflow-auto">
        {children}
      </div>
    </div>
  )
}