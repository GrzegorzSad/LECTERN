import { ScrollArea } from "./scroll-area"
import { Card } from "./card"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu"
import type { Group } from "../../types/types"
import { useNavigate } from "react-router-dom"

interface GroupListProps {
  groups: Group[]
  onDelete?: (group: Group) => void
}

export function GroupList({ groups, onDelete }: GroupListProps) {
  const navigate = useNavigate()

  return (
    <ScrollArea className="rounded-md border">
      <div className="flex flex-col gap-4 p-4">
        {groups.map((group) => (
          <ContextMenu key={group.id}>
            <ContextMenuTrigger>
              <Card
                className="cursor-pointer overflow-hidden transition hover:shadow-md"
                onClick={() => navigate(`/group/${group.id}`)}
              >
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={group.img}
                    alt={group.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2 text-center text-sm font-medium">
                  {group.name}
                </div>
              </Card>
            </ContextMenuTrigger>

            <ContextMenuContent>
              <ContextMenuItem onClick={() => navigate(`/group/${group.id}`)}>
                Open
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onDelete?.(group)}>
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </ScrollArea>
  )
}