import { useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import type { Channel, PrivateChat } from "../types/types";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
} from "lucide-react";

interface ChannelListProps {
  channels: Channel[];
  privateChats: PrivateChat[];
  selectedId?: number;
  selectedPrivateChatId?: number;
  onSelect: (channel: Channel) => void;
  onSelectPrivateChat: (chat: PrivateChat) => void;
  onDelete?: (channel: Channel) => void;
  onDeletePrivateChat?: (chat: PrivateChat) => void;
  onRename?: (channel: Channel) => void;
  onCreate?: () => void;
}

export function ChannelList({
  channels,
  privateChats,
  selectedId,
  selectedPrivateChatId,
  onSelect,
  onSelectPrivateChat,
  onDelete,
  onDeletePrivateChat,
  onRename,
  onCreate,
}: ChannelListProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex flex-col h-full transition-all duration-200",
          collapsed ? "w-10" : "w-52",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center shrink-0",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <h1 className="px-2 text-xs font-semibold text-muted-foreground">
              Channels
            </h1>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors px-1 rounded"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex flex-col gap-1 flex-1 overflow-y-auto p-2">
          {/* Public channels */}
          {channels.map((channel) => (
            <div key={channel.id} className="group relative flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelect(channel)}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors min-w-0",
                      selectedId === channel.id
                        ? "bg-channel text-channel-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="truncate">
                      {collapsed ? channel.name.slice(0, 1) : channel.name}
                    </span>
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{channel.name}</TooltipContent>
                )}
              </Tooltip>

              {!collapsed && (onRename || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "absolute right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                        selectedId === channel.id
                          ? "text-channel-foreground hover:bg-channel/80"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
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

          {/* Private chats */}
          {privateChats.length > 0 && (
            <>
              {!collapsed && (
                <p className=" pt-3 pb-1 text-xs font-semibold text-muted-foreground">
                  Private
                </p>
              )}
              {privateChats.map((chat) => (
                <div key={chat.id} className="group relative flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onSelectPrivateChat(chat)}
                        className={cn(
                          "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors min-w-0",
                          selectedPrivateChatId === chat.id
                            ? "bg-channel text-channel-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Lock className="h-3 w-3 shrink-0" />
                        {!collapsed && (
                          <span className="truncate">{chat.name}</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">{chat.name}</TooltipContent>
                    )}
                  </Tooltip>

                  {!collapsed && onDeletePrivateChat && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "absolute right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                            selectedPrivateChatId === chat.id
                              ? "text-channel-foreground hover:bg-channel/80"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDeletePrivateChat(chat)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onCreate}
                  className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">New Channel</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={onCreate}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Channel
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}