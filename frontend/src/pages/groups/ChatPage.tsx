import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BASE_URL,
  channelsApi,
  messagesApi,
  privateChatsApi,
} from "../../api/client";
import type { Channel, PrivateChat, Message } from "../../types/types";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { useGroup } from "./GroupLayout";
import { ChannelList } from "../../components/channel-list";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { useSocket } from "../../hooks/useSocket";
import {
  BookOpen,
  X,
  CornerUpLeft,
  PanelLeftOpen,
  Pin,
  PanelRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetTrigger } from "../../components/sheet";
import { NotesPanel } from "./NotesPanel";

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${time}`;
};

interface Source {
  chunkId: number;
  fileId: number;
  fileName: string;
  preview: string;
}

type SourceMap = Record<number, Source[]>;

function SourcesPopover({
  sources,
  onClose,
}: {
  sources: Source[];
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full mb-2 left-0 z-20 w-72 rounded-lg border bg-background shadow-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: `1px solid` }}
      >
        <span className="text-xs font-semibold">Sources</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="divide-y max-h-60 overflow-y-auto">
        {sources.map((s) => (
          <a
            key={s.chunkId}
            href={`${BASE_URL}/documents/preview/${s.fileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 space-y-0.5 hover:bg-muted/30"
          >
            <p className="text-xs font-medium truncate">{s.fileName}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {s.preview}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

interface PinnedMessagesPopoverProps {
  pinnedMessages: Message[];
  canUnpin: boolean;
  onUnpin: (msg: Message) => void;
  onScrollTo: (id: number) => void;
  onClose: () => void;
  activeColor: string | null;
}

function PinnedMessagesPopover({
  pinnedMessages,
  canUnpin,
  onUnpin,
  onScrollTo,
  onClose,
  activeColor,
}: PinnedMessagesPopoverProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full mt-1 right-0 z-60 w-80 rounded-lg border bg-background shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-1.5">
            <Pin
              className="h-3.5 w-3.5 fill-current"
              style={{ color: activeColor ?? "hsl(var(--primary))" }}
            />
            <span className="text-xs font-semibold">Pinned Messages</span>
            <span className="text-xs text-muted-foreground">
              ({pinnedMessages.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="divide-y max-h-72 overflow-y-auto">
          {pinnedMessages.map((msg) => (
            <div
              key={msg.id}
              className="px-3 py-2.5 hover:bg-muted/20 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-foreground">
                      {msg.isAi
                        ? "AI"
                        : (msg.user?.name ?? `User #${msg.userId}`)}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onScrollTo(msg.id);
                      onClose();
                    }}
                    className="text-xs text-muted-foreground text-left hover:text-foreground transition-colors line-clamp-2 w-full"
                    title="Jump to message"
                  >
                    {msg.content.length > 120
                      ? `${msg.content.slice(0, 120)}...`
                      : msg.content}
                  </button>
                </div>
                {canUnpin && (
                  <button
                    onClick={() => onUnpin(msg)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Unpin message"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { group, loading, error, myRole } = useGroup();
  const { user: currentUser, userLoading } = useAuth();
  const socket = useSocket();

  const isAdmin = myRole === "OWNER" || myRole === "ADMIN";

  const [channelListCollapsed, setChannelListCollapsed] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [privateChats, setPrivateChats] = useState<PrivateChat[]>([]);
  const [selectedPrivateChat, setSelectedPrivateChat] =
    useState<PrivateChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [sourceMap, setSourceMap] = useState<SourceMap>({});
  const [openSourceMsgId, setOpenSourceMsgId] = useState<number | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [pinnedPopoverOpen, setPinnedPopoverOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const pinnedMessages = messages.filter((m) => m.isPinned);

  const scrollToMessage = (messageId: number | null) => {
    if (!messageId) return;
    const target = document.getElementById(`message-${messageId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add(
        "ring",
        "ring-primary/40",
        "ring-offset-2",
        "ring-offset-background",
      );
      setTimeout(() => {
        target.classList.remove(
          "ring",
          "ring-primary/40",
          "ring-offset-2",
          "ring-offset-background",
        );
      }, 1200);
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<
    "create" | "rename" | "renamePrivate"
  >("create");
  const [channelName, setChannelName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editingPrivateChat, setEditingPrivateChat] =
    useState<PrivateChat | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      channelsApi.list(Number(id)),
      privateChatsApi.list(Number(id)),
    ])
      .then(([channelData, privateChatData]) => {
        setChannels(channelData);
        setPrivateChats(privateChatData);
        if (channelData.length > 0) setSelectedChannel(channelData[0]);
      })
      .finally(() => setChannelsLoading(false));
  }, [id]);

  useEffect(() => {
    if (userLoading) return;
    if (selectedChannel) {
      setMessagesLoading(true);
      setMessages([]);
      messagesApi
        .list(selectedChannel.id)
        .then(setMessages)
        .finally(() => setMessagesLoading(false));
    } else if (selectedPrivateChat) {
      setMessagesLoading(true);
      setMessages([]);
      messagesApi
        .listPrivate(selectedPrivateChat.id)
        .then(setMessages)
        .finally(() => setMessagesLoading(false));
    }
    setPinnedPopoverOpen(false);
  }, [selectedChannel, selectedPrivateChat, userLoading]);

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedChannel) return;
    socket.emit("joinChannel", selectedChannel.id);
    return () => {
      socket.emit("leaveChannel", selectedChannel.id);
    };
  }, [selectedChannel]);

  useEffect(() => {
    socket.on("newMessage", (message: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.isAi) setAsking(false);
    });
    return () => {
      socket.off("newMessage");
    };
  }, [socket]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setChannelName("");
    setIsPrivate(!isAdmin);
    setEditingChannel(null);
    setEditingPrivateChat(null);
    setDialogOpen(true);
  };

  const openRenameDialog = (channel: Channel) => {
    setDialogMode("rename");
    setChannelName(channel.name);
    setEditingChannel(channel);
    setEditingPrivateChat(null);
    setDialogOpen(true);
  };

  const openRenamePrivateChatDialog = (chat: PrivateChat) => {
    setDialogMode("renamePrivate");
    setChannelName(chat.name);
    setEditingPrivateChat(chat);
    setEditingChannel(null);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async () => {
    if (!channelName.trim() || !id) return;
    if (dialogMode === "create") {
      if (isPrivate) {
        const newChat = await privateChatsApi.create(
          Number(id),
          channelName.trim(),
        );
        setPrivateChats((prev) => [...prev, newChat]);
        setSelectedPrivateChat(newChat);
        setSelectedChannel(null);
      } else {
        const newChannel = await channelsApi.create(Number(id), {
          name: channelName.trim(),
        });
        setChannels((prev) => [...prev, newChannel]);
        setSelectedChannel(newChannel);
        setSelectedPrivateChat(null);
      }
    } else if (dialogMode === "rename" && editingChannel) {
      const updated = await channelsApi.update(Number(id), editingChannel.id, {
        name: channelName.trim(),
      });
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      if (selectedChannel?.id === updated.id) setSelectedChannel(updated);
    } else if (dialogMode === "renamePrivate" && editingPrivateChat) {
      const updated = await privateChatsApi.rename(
        Number(id),
        editingPrivateChat.id,
        channelName.trim(),
      );
      setPrivateChats((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      if (selectedPrivateChat?.id === updated.id)
        setSelectedPrivateChat(updated);
    }
    setDialogOpen(false);
    setChannelName("");
  };

  const handleDeleteChannel = async (channel: Channel) => {
    if (!id) return;
    try {
      await channelsApi.remove(Number(id), channel.id);
      const data = await channelsApi.list(Number(id));
      setChannels(data);
      setSelectedChannel((prev) =>
        prev?.id === channel.id ? (data[0] ?? null) : prev,
      );
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDeletePrivateChat = async (chat: PrivateChat) => {
    if (!id) return;
    try {
      await privateChatsApi.remove(Number(id), chat.id);
      setPrivateChats((prev) => prev.filter((c) => c.id !== chat.id));
      setSelectedPrivateChat((prev) => (prev?.id === chat.id ? null : prev));
    } catch (err) {
      console.error("Delete private chat failed:", err);
    }
  };

  const handleColorChange = async (channel: Channel, color: string) => {
    if (!id) return;
    const updated = await channelsApi.update(Number(id), channel.id, { color });
    setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (selectedChannel?.id === updated.id) setSelectedChannel(updated);
  };

  const handlePrivateChatColorChange = async (
    chat: PrivateChat,
    color: string,
  ) => {
    if (!id) return;
    const updated = await privateChatsApi.rename(
      Number(id),
      chat.id,
      chat.name,
      color,
    );
    setPrivateChats((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
    if (selectedPrivateChat?.id === updated.id) setSelectedPrivateChat(updated);
  };

  const handlePinMessage = async (msg: Message) => {
    try {
      let updated: Message;
      if (selectedChannel) {
        updated = await messagesApi.pin(selectedChannel.id, msg.id);
      } else if (selectedPrivateChat) {
        updated = await messagesApi.pinPrivate(selectedPrivateChat.id, msg.id);
      } else {
        return;
      }
      skipScrollRef.current = true;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id ? { ...m, isPinned: updated.isPinned } : m,
        ),
      );
    } catch (err) {
      console.error("Pin failed:", err);
    }
  };

  const handleAsk = async (noAi = false) => {
    if (!question.trim() || (!selectedChannel && !selectedPrivateChat)) return;
    const content = question.trim();
    const parentMessageId = replyToMessage?.id;
    setQuestion("");
    if (!noAi) setAsking(true);
    try {
      if (selectedChannel) {
        const { userMessage, aiMessage, sources } = await messagesApi.send(
          selectedChannel.id,
          { content, noAi, parentMessageId },
        );
        setMessages((prev) => [...prev, userMessage]);
        if (aiMessage) {
          setMessages((prev) => [...prev, aiMessage]);
          if (sources?.length)
            setSourceMap((prev) => ({ ...prev, [aiMessage.id]: sources }));
        }
      } else if (selectedPrivateChat) {
        const { userMessage, aiMessage, sources } =
          await messagesApi.sendPrivate(selectedPrivateChat.id, {
            content,
            parentMessageId,
          });
        setMessages((prev) => [...prev, userMessage]);
        if (aiMessage) {
          setMessages((prev) => [...prev, aiMessage]);
          if (sources?.length)
            setSourceMap((prev) => ({ ...prev, [aiMessage.id]: sources }));
        }
      }
      setReplyToMessage(null);
      setAsking(false);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content: "Error getting response.",
          isAi: true,
          channelId: selectedChannel?.id ?? null,
          privateChatId: selectedPrivateChat?.id ?? null,
          userId: 0,
          isPinned: false,
          createdAt: new Date().toISOString(),
          replies: [],
        } as Message,
      ]);
      setReplyToMessage(null);
      setAsking(false);
    }
  };

  const handleAskChannel = async (noAi = false) => {
    if (!question.trim() || !selectedChannel) return;
    const content = question.trim();
    const parentMessageId = replyToMessage?.id;
    setQuestion("");
    if (!noAi) setAsking(true);
    try {
      const { aiMessage, sources } = await messagesApi.send(
        selectedChannel.id,
        { content, noAi, parentMessageId },
      );
      if (aiMessage?.id && sources?.length)
        setSourceMap((prev) => ({ ...prev, [aiMessage.id]: sources }));
      setReplyToMessage(null);
      setAsking(false);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content: "Error getting response.",
          isAi: true,
          channelId: selectedChannel.id,
          privateChatId: null,
          userId: 0,
          isPinned: false,
          createdAt: new Date().toISOString(),
          replies: [],
        } as Message,
      ]);
      setReplyToMessage(null);
      setAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (selectedChannel) handleAskChannel(false);
    else handleAsk(false);
  };

  const getMessageStyle = (msg: Message) => {
    if (msg.isAi) return "ai";
    if (msg.userId === currentUser?.id) return "own";
    return "other";
  };

  const canPin = (_msg: Message) => {
    if (selectedChannel) return isAdmin;
    if (selectedPrivateChat) return true;
    return false;
  };

  const channelListProps = {
    channels,
    privateChats,
    selectedId: selectedChannel?.id,
    selectedPrivateChatId: selectedPrivateChat?.id,
    onSelect: (ch: Channel) => {
      setSelectedChannel(ch);
      setSelectedPrivateChat(null);
      setMobileSheetOpen(false);
    },
    onSelectPrivateChat: (chat: PrivateChat) => {
      setSelectedPrivateChat(chat);
      setSelectedChannel(null);
      setMobileSheetOpen(false);
    },
    onDelete: isAdmin ? handleDeleteChannel : undefined,
    onRename: isAdmin ? openRenameDialog : undefined,
    onDeletePrivateChat: handleDeletePrivateChat,
    onRenamePrivateChat: openRenamePrivateChatDialog,
    onChannelSettings: isAdmin
      ? (channel: Channel) => {
          if (group)
            navigate(`/group/${group.id}/settings?channel=${channel.id}`);
        }
      : undefined,
    onColorChange: isAdmin ? handleColorChange : undefined,
    onPrivateChatColorChange: handlePrivateChatColorChange,
    onCreate: openCreateDialog,
  };

  const activeColor =
    selectedChannel?.color || selectedPrivateChat?.color || null;
  const activeName = selectedChannel?.name ?? selectedPrivateChat?.name ?? null;

  if (loading || channelsLoading || userLoading) return <div></div>;
  if (error || !group) return <div>Group not found</div>;

  const dialogTitle = () => {
    if (dialogMode === "rename") return "Rename Channel";
    if (dialogMode === "renamePrivate") return "Rename Private Chat";
    return isPrivate ? "New Private Chat" : "New Channel";
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop channel list */}
      <div className="hidden md:flex md:flex-col">
        <ChannelList
          {...channelListProps}
          collapsed={channelListCollapsed}
          onCollapse={setChannelListCollapsed}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">
        {activeName ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 px-2 py-1 shrink-0">
              {/* Mobile sheet trigger */}
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <button className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  showCloseButton={false}
                  side="left"
                  className="w-52 pt-3"
                >
                  <ChannelList
                    {...channelListProps}
                    onCollapse={() => setMobileSheetOpen(false)}
                  />
                </SheetContent>
              </Sheet>

              <span className="text-sm font-semibold flex items-center gap-2">
                {activeColor && (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeColor }}
                  />
                )}
                # {activeName}
              </span>

              {pinnedMessages.length > 0 && (
                <div className="relative ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => setPinnedPopoverOpen((o) => !o)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                      pinnedPopoverOpen
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    title="View pinned messages"
                  >
                    <Pin
                      className="h-3.5 w-3.5 fill-current"
                      style={{ color: activeColor ?? undefined }}
                    />
                    <span>{pinnedMessages.length}</span>
                  </button>

                  {pinnedPopoverOpen && (
                    <PinnedMessagesPopover
                      pinnedMessages={pinnedMessages}
                      canUnpin={canPin(pinnedMessages[0])}
                      onUnpin={handlePinMessage}
                      onScrollTo={scrollToMessage}
                      onClose={() => setPinnedPopoverOpen(false)}
                      activeColor={activeColor}
                    />
                  )}
                </div>
              )}

              {pinnedMessages.length < 1 && <div className="ml-auto" />}

              <button
                onClick={() => setNotesOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  notesOpen
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                title="Open notes"
              >
                <PanelRight className="h-3.5 w-3.5" />
                <span className="">Notes</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex overflow-hidden h-full relative">
              <div className="flex-1 overflow-y-auto overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col gap-4 min-h-full">
                  {messagesLoading && (
                    <p className="text-muted-foreground text-sm">
                      Loading messages...
                    </p>
                  )}
                  {!messagesLoading && messages.length === 0 && (
                    <p className="text-muted-foreground text-sm flex flex-col items-center flex-grow h-full justify-center">
                      No messages yet — ask something!
                    </p>
                  )}
                  {messages.map((msg) => {
                    const style = getMessageStyle(msg);
                    const msgSources = sourceMap[msg.id];
                    const isSourceOpen = openSourceMsgId === msg.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[75%] gap-1",
                          style === "own"
                            ? "self-end items-end"
                            : "self-start items-start",
                        )}
                      >
                        {msg.parentMessageId && (
                          <div className="rounded-lg border border-muted/40 px-3 py-1 text-xs text-muted-foreground mb-1">
                            Replying to:
                            {(() => {
                              const parent = messages.find(
                                (m) => m.id === msg.parentMessageId,
                              );
                              if (parent) {
                                return (
                                  <button
                                    onClick={() => scrollToMessage(parent.id)}
                                    className="font-medium text-foreground hover:text-primary transition-colors text-left w-full"
                                  >
                                    {parent.user?.name ??
                                      (parent.isAi
                                        ? "AI"
                                        : `User #${parent.userId}`)}
                                    :{" "}
                                    {parent.content.length > 80
                                      ? `${parent.content.slice(0, 80)}...`
                                      : parent.content}
                                  </button>
                                );
                              }
                              return (
                                <span className="font-medium text-foreground">
                                  Unknown message
                                </span>
                              );
                            })()}
                          </div>
                        )}
                        <div
                          id={`message-${msg.id}`}
                          className={cn(
                            "rounded-lg px-4 py-2 text-sm break-words",
                            style === "ai" &&
                              "bg-transparent ps-0 pb-1 text-foreground",
                            style === "own" &&
                              !activeColor &&
                              "bg-channel text-primary-foreground",
                          )}
                          style={
                            style === "own" && activeColor
                              ? { backgroundColor: activeColor, color: "#fff" }
                              : style !== "own" && style !== "ai"
                                ? {
                                    backgroundColor: "hsl(var(--muted))",
                                    color: "hsl(var(--foreground))",
                                  }
                                : undefined
                          }
                        >
                          <ReactMarkdown>
                            {msg.content.replace(/\\n/g, "\n")}
                          </ReactMarkdown>
                        </div>

                        <div className="flex items-center gap-2 px-1 relative">
                          {style !== "own" && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {style === "ai"
                                ? "AI"
                                : (msg.user?.name ?? `User #${msg.userId}`)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground/60">
                            {formatTime(msg.createdAt)}
                          </span>
                          {style === "ai" && msgSources?.length ? (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenSourceMsgId((prev) =>
                                    prev === msg.id ? null : msg.id,
                                  )
                                }
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                title="View sources"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span>
                                  Source {msgSources.length} 
                                </span>
                              </button>
                              {isSourceOpen && (
                                <SourcesPopover
                                  sources={msgSources}
                                  onClose={() => setOpenSourceMsgId(null)}
                                />
                              )}
                            </div>
                          ) : null}
                          <button
                            onClick={() => setReplyToMessage(msg)}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            title="Reply to message"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Reply</span>
                          </button>
                          {canPin(msg) && (
                            <button
                              onClick={() => handlePinMessage(msg)}
                              className={cn(
                                "text-xs transition-colors flex items-center gap-1",
                                msg.isPinned
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-primary",
                              )}
                              title={
                                msg.isPinned ? "Unpin message" : "Pin message"
                              }
                            >
                              <Pin
                                className={cn(
                                  "h-3 w-3",
                                  msg.isPinned && "fill-current",
                                )}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {asking && (
                    <div className="self-start flex flex-col gap-1 items-start">
                      <div
                        className="rounded-lg px-4 py-2 text-sm text-muted-foreground animate-pulse"
                        style={{
                          backgroundColor:
                            (activeColor ?? "hsl(var(--primary))") + "18",
                        }}
                      >
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
                {/* Input */}
                <div className="mt-auto w-full px-4 pb-4 pointer-events-none sticky bottom-0">
                  <div className="max-w-2xl mx-auto pointer-events-auto">
                    {replyToMessage && (
                      <div className="mb-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs flex justify-between items-center">
                        <div className="truncate">
                          Replying to{" "}
                          {replyToMessage.user?.name ??
                            (replyToMessage.isAi
                              ? "AI"
                              : `User #${replyToMessage.userId}`)}
                          :{" "}
                          {replyToMessage.content.length > 90
                            ? `${replyToMessage.content.slice(0, 90)}...`
                            : replyToMessage.content}
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyToMessage(null)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Cancel reply"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 items-center bg-popover/85 backdrop-blur-sm border rounded-xl px-3 py-2 shadow-lg">
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          selectedPrivateChat
                            ? "Ask AI something..."
                            : "Message or ask AI..."
                        }
                        className="flex-1 border-0 shadow-none focus-visible:ring-0"
                        disabled={asking}
                      />
                      {selectedChannel && (
                        <Button
                          variant="ghost"
                          onClick={() => handleAskChannel(true)}
                          disabled={asking || !question.trim()}
                          size="lg"
                        >
                          Send
                        </Button>
                      )}
                      <Button
                        variant="channel"
                        onClick={() =>
                          selectedChannel
                            ? handleAskChannel(false)
                            : handleAsk(false)
                        }
                        disabled={asking || !question.trim()}
                        size="lg"
                        style={
                          activeColor
                            ? {
                                backgroundColor: activeColor,
                                borderColor: activeColor,
                              }
                            : undefined
                        }
                      >
                        {asking ? "Asking..." : "Ask AI"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <NotesPanel
                open={notesOpen}
                onClose={() => setNotesOpen(false)}
                groupId={Number(id)}
              />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">
              No channels yet — create one to get started.
            </p>
            {(isAdmin) && (
              <Button onClick={openCreateDialog} size="lg">
                + Create Channel
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="p-6 w-80 space-y-4">
            <h2 className="text-lg font-semibold">{dialogTitle()}</h2>
            {dialogMode === "create" && isAdmin && (
              <div className="flex rounded-md border overflow-hidden text-sm">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={cn(
                    "flex-1 py-1.5 transition-colors",
                    !isPrivate
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  Public
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={cn(
                    "flex-1 py-1.5 transition-colors",
                    isPrivate
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  Private
                </button>
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="channel-name" className="text-sm font-medium">
                {dialogMode === "renamePrivate"
                  ? "Private chat name"
                  : isPrivate
                    ? "Private chat name"
                    : "Channel name"}
              </label>
              <Input
                id="channel-name"
                autoFocus
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDialogSubmit()}
                placeholder={
                  dialogMode === "renamePrivate"
                    ? "Enter private chat name"
                    : isPrivate
                      ? "Enter private chat name"
                      : "Enter channel name"
                }
                className="bg-popover text-black"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDialogSubmit}
                disabled={!channelName.trim()}
              >
                {dialogMode === "create" ? "Create" : "Rename"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
