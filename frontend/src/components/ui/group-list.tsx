import { useState } from "react";
import { ScrollArea } from "./scroll-area";
import { Card, CardHeader, CardTitle } from "./card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import type { Group } from "../../types/types";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface GroupListProps {
  groups: Group[];
  onDelete?: (group: Group) => void;
}

export function GroupList({ groups, onDelete }: GroupListProps) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | undefined>();

  const handleClick = (group: Group) => {
    setSelectedId(group.id);
    navigate(`/group/${group.id}`);
  };

  return (
    <ScrollArea className="rounded-md">
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <ContextMenu key={group.id}>
            <ContextMenuTrigger>
              <Card
                className={cn(
                  "cursor-pointer transition hover:shadow-md bg-transparent ring-0 shadow-none",
                  selectedId === group.id && "ring-2 ring-primary bg-primary text-secondary",
                )}
                onClick={() => handleClick(group)}
              >
                {group.img && (
                  <img
                    src={group.img}
                    alt={group.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                </CardHeader>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handleClick(group)}>
                Open
              </ContextMenuItem>
              <ContextMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(group)}
              >
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
      <div className="p-4 pt-4">
        <Link to="/group/create">
          <Button className="w-full" variant="outline">
            + New Group
          </Button>
        </Link>
      </div>
    </ScrollArea>
  );
}
