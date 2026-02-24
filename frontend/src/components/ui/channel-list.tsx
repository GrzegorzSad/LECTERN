import { cn } from "../../lib/utils";
import { Button } from "./button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import type { Channel } from "../../types/types";

interface ChannelListProps {
  channels: Channel[];
  selectedId?: number;
  onSelect: (channel: Channel) => void;
  onDelete?: (channel: Channel) => void;
  onRename?: (channel: Channel) => void;
  onCreate?: () => void;
}

export function ChannelList({
  channels,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onCreate,
}: ChannelListProps) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-widest px-2 mb-2">
        Channels
      </p>
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {channels.map((channel) => (
          <ContextMenu key={channel.id}>
            <ContextMenuTrigger>
              <button
                onClick={() => onSelect(channel)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  selectedId === channel.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                # {channel.name}
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onSelect(channel)}>
                Open
              </ContextMenuItem>
              {onRename && (
                <ContextMenuItem onClick={() => onRename(channel)}>
                  Rename
                </ContextMenuItem>
              )}
              {onDelete && (
                <ContextMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(channel)}
                >
                  Delete
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
      <div className="pt-2 mt-2 border-t">
        <Button className="w-full" variant="outline" size="sm" onClick={onCreate}>
          + New Channel
        </Button>
      </div>
    </div>
  );
}