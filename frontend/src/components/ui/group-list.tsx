import { ScrollArea } from "./scroll-area"
import { Card } from "./card"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu"

export interface Group {
  id: string
  title: string
  imageUrl: string
}

interface GroupListProps {
  groups: Group[]
  onOpen?: (group: Group) => void
  onDelete?: (group: Group) => void
}

export function GroupList({ groups, onOpen, onDelete }: GroupListProps) {
  return (
    <ScrollArea className="h-[500px] w-[220px] rounded-md border">
      <div className="flex flex-col gap-4 p-4">
        {groups.map((group) => (
          <ContextMenu key={group.id}>
            <ContextMenuTrigger>
              <Card
                className="cursor-pointer overflow-hidden transition hover:shadow-md"
                onClick={() => onOpen?.(group)}
              >
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={group.imageUrl}
                    alt={group.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2 text-center text-sm font-medium">
                  {group.title}
                </div>
              </Card>
            </ContextMenuTrigger>

            <ContextMenuContent>
              <ContextMenuItem onClick={() => onOpen?.(group)}>
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