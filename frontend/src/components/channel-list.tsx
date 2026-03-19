import { useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Settings,
} from "lucide-react";

const COLORS = [
  "#6366f1",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#64748b",
];

function ColorPicker({
  current,
  onChange,
}: {
  current?: string | null;
  onChange: (color: string) => void;
}) {
  return (
    <div className="px-2 py-1.5 space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">Color</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange("")}
          className={cn(
            "w-5 h-5 rounded-full border-2 border-dashed transition-transform hover:scale-110",
            !current ? "border-foreground scale-110" : "border-muted-foreground",
          )}
          title="Default"
        />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={cn(
              "w-5 h-5 rounded-full transition-transform hover:scale-110",
              current === c ? "scale-125 ring-2 ring-offset-1 ring-foreground" : "",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

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
  onRenamePrivateChat?: (chat: PrivateChat) => void;
  onChannelSettings?: (channel: Channel) => void;
  onPrivateChatSettings?: (chat: PrivateChat) => void;
  onColorChange?: (channel: Channel, color: string) => void;
  onPrivateChatColorChange?: (chat: PrivateChat, color: string) => void;
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
  onRenamePrivateChat,
  onColorChange,
  onPrivateChatColorChange,
  onChannelSettings,
  onPrivateChatSettings,
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
          {channels.map((channel) => {
            const color = channel.color || null;
            const isSelected = selectedId === channel.id;
            return (
              <div key={channel.id} className="group relative flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelect(channel)}
                      style={isSelected && color ? { backgroundColor: color } : undefined}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors min-w-0",
                        isSelected
                          ? color ? "text-white" : "bg-channel text-channel-foreground"
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

                {!collapsed && (onRename || onDelete || onColorChange) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "absolute right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                          isSelected
                            ? color ? "text-white hover:bg-white/20" : "text-channel-foreground hover:bg-channel/80"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      {onRename && (
                        <DropdownMenuItem onClick={() => onRename(channel)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                      )}
                      {onChannelSettings && (
                        <DropdownMenuItem onClick={() => onChannelSettings(channel)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
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
                      {onColorChange && (
                        <>
                          <DropdownMenuSeparator />
                          <ColorPicker
                            current={channel.color}
                            onChange={(c) => onColorChange(channel, c)}
                          />
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}

          {/* Private chats */}
          {privateChats.length > 0 && (
            <>
              {!collapsed && (
                <p className="pt-3 pb-1 text-xs font-semibold text-muted-foreground">
                  Private
                </p>
              )}
              {privateChats.map((chat) => {
                const color = chat.color || null;
                const isSelected = selectedPrivateChatId === chat.id;
                return (
                  <div key={chat.id} className="group relative flex items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onSelectPrivateChat(chat)}
                          style={isSelected && color ? { backgroundColor: color } : undefined}
                          className={cn(
                            "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors min-w-0",
                          collapsed ? "justify-center" : "justify-start",
                            isSelected
                              ? color ? "text-white" : "bg-channel text-channel-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Lock className="h-3 w-3 shrink-0 text-current" />
                          {!collapsed && (
                            <span className="truncate">{chat.name}</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">{chat.name}</TooltipContent>
                      )}
                    </Tooltip>

                    {!collapsed && (onRenamePrivateChat || onDeletePrivateChat || onPrivateChatColorChange) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "absolute right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                              isSelected
                                ? color ? "text-white hover:bg-white/20" : "text-channel-foreground hover:bg-channel/80"
                                : "text-muted-foreground hover:bg-muted",
                            )}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="w-48">
                          {onPrivateChatSettings && (
                            <DropdownMenuItem onClick={() => onPrivateChatSettings(chat)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                          )}
                          {onRenamePrivateChat && (
                            <DropdownMenuItem onClick={() => onRenamePrivateChat(chat)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                          )}
                          {onDeletePrivateChat && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDeletePrivateChat(chat)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                          {onPrivateChatColorChange && (
                            <>
                              <DropdownMenuSeparator />
                              <ColorPicker
                                current={chat.color}
                                onChange={(c) => onPrivateChatColorChange(chat, c)}
                              />
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
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
              <TooltipContent side="right">New</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
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