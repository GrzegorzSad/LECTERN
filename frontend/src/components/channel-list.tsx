import { useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import type { Channel } from "../types/types";
import { MoreHorizontal, Plus, Pencil, Trash2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-200",
        collapsed ? "w-10" : "w-52"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center py-2 shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <p className="px-2 text-xs font-semibold uppercase text-muted-foreground tracking-widest">
            Channels
          </p>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Channel list */}
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto p-2">
        {channels.map((channel) => (
          <div key={channel.id} className="group relative flex items-center">
            <button
              onClick={() => onSelect(channel)}
              title={channel.name}
              className={cn(
                "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors min-w-0",
                selectedId === channel.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="shrink-0">#</span>
              {!collapsed && <span className="truncate">{channel.name}</span>}
            </button>

            {/* Actions — only when expanded */}
            {!collapsed && (onRename || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "absolute right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                    selectedId === channel.id
                      ? "text-primary-foreground hover:bg-primary/80"
                      : "text-muted-foreground hover:bg-muted"
                  )}>
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  {onRename && (
                    <DropdownMenuItem onClick={() => onRename(channel)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(channel)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 shrink-0">
        {collapsed ? (
          <button
            onClick={onCreate}
            title="New Channel"
            className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <Button variant="outline" className="w-full" size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Channel
          </Button>
        )}
      </div>
    </div>
  );
}