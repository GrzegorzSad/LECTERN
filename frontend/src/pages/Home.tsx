import { Button } from "../components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../components/ui/navigation-menu";
import { GroupList, type Group } from "../components/ui/group-list";
import { Link } from "react-router-dom";

function Home() {
  const groups: Group[] = [
    { id: "1", title: "Math", imageUrl: "https://picsum.photos/200" },
    { id: "2", title: "Physics", imageUrl: "https://picsum.photos/201" },
  ];

  function ListItem({
    title,
    children,
    href,
    ...props
  }: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
    return (
      <li {...props}>
        <NavigationMenuLink>
          <Link to={href}>
            <div className="flex flex-col gap-1 text-sm">
              <div className="leading-none font-medium">{title}</div>
              <div className="text-muted-foreground line-clamp-2">
                {children}
              </div>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }

  return (
    <div className="h-screen grid grid-rows-[64px_1fr] grid-cols-[240px_1fr]">
      {/* Sidebar: spans both rows */}
      <div className="row-start-1 row-end-3 col-start-1 border-r overflow-y-auto p-4 bg-background">
        <GroupList
          groups={groups}
          onOpen={(g) => console.log("open", g)}
          onDelete={(g) => console.log("delete", g)}
        />
      </div>

      {/* Navbar: top row, right of sidebar */}
      <div className="row-start-1 col-start-2 border-b bg-background flex items-center px-6">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-96 p-4">
                  <ListItem href="/docs" title="Introduction">
                    Re-usable components built with Tailwind CSS.
                  </ListItem>
                  <ListItem href="/docs/installation" title="Installation">
                    How to install dependencies and structure your app.
                  </ListItem>
                  <ListItem
                    href="/docs/primitives/typography"
                    title="Typography"
                  >
                    Styles for headings, paragraphs, lists...etc
                  </ListItem>
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

      {/* Main content: bottom right */}
      <div className="row-start-2 col-start-2 p-8 overflow-auto">
        <Button variant="default" size="lg">
          Primary
        </Button>
      </div>
    </div>
  );
}

export default Home;
