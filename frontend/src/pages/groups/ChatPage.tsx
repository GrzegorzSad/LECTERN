import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { channelsApi, messagesApi, privateChatsApi } from "../../api/client";
import type { Channel, PrivateChat, Message } from "../../types/types";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { useGroup } from "./GroupLayout";
import { ChannelList } from "../../components/channel-list";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { useSocket } from "../../hooks/useSocket";
import { BookOpen, X } from "lucide-react";

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${time}`;
};

interface Source {
  chunkId: number;
  fileName: string;
  preview: string;
}

// Sources attached to a specific message id
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
        style={{ borderBottom: `1px solid ` }}
      >
        <span className="text-xs font-semibold">
          Sources
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="divide-y max-h-60 overflow-y-auto">
        {sources.map((s) => (
          <div key={s.chunkId} className="px-3 py-2 space-y-0.5">
            <p className="text-xs font-medium truncate">{s.fileName}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{s.preview}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatPage() {
  const { id } = useParams();
  const { group, loading, error, myRole } = useGroup();
  const { user: currentUser, userLoading } = useAuth();
  const socket = useSocket();

  const isAdmin = myRole === "OWNER" || myRole === "ADMIN";

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [privateChats, setPrivateChats] = useState<PrivateChat[]>([]);
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<PrivateChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [sourceMap, setSourceMap] = useState<SourceMap>({});
  const [openSourceMsgId, setOpenSourceMsgId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename" | "renamePrivate">("create");
  const [channelName, setChannelName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editingPrivateChat, setEditingPrivateChat] = useState<PrivateChat | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([channelsApi.list(Number(id)), privateChatsApi.list(Number(id))])
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
      messagesApi.list(selectedChannel.id).then(setMessages).finally(() => setMessagesLoading(false));
    } else if (selectedPrivateChat) {
      setMessagesLoading(true);
      setMessages([]);
      messagesApi.listPrivate(selectedPrivateChat.id).then(setMessages).finally(() => setMessagesLoading(false));
    }
  }, [selectedChannel, selectedPrivateChat, userLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedChannel) return;
    socket.emit("joinChannel", selectedChannel.id);
    return () => { socket.emit("leaveChannel", selectedChannel.id); };
  }, [selectedChannel]);

  useEffect(() => {
    socket.on("newMessage", (message: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (message.isAi) setAsking(false);
    });
    return () => { socket.off("newMessage"); };
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
        const newChat = await privateChatsApi.create(Number(id), channelName.trim());
        setPrivateChats((prev) => [...prev, newChat]);
        setSelectedPrivateChat(newChat);
        setSelectedChannel(null);
      } else {
        const newChannel = await channelsApi.create(Number(id), { name: channelName.trim() });
        setChannels((prev) => [...prev, newChannel]);
        setSelectedChannel(newChannel);
        setSelectedPrivateChat(null);
      }
    } else if (dialogMode === "rename" && editingChannel) {
      const updated = await channelsApi.update(Number(id), editingChannel.id, { name: channelName.trim() });
      setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedChannel?.id === updated.id) setSelectedChannel(updated);
    } else if (dialogMode === "renamePrivate" && editingPrivateChat) {
      const updated = await privateChatsApi.rename(Number(id), editingPrivateChat.id, channelName.trim());
      setPrivateChats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedPrivateChat?.id === updated.id) setSelectedPrivateChat(updated);
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
      setSelectedChannel((prev) => prev?.id === channel.id ? (data[0] ?? null) : prev);
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
    setChannels((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    if (selectedChannel?.id === updated.id) setSelectedChannel(updated);
  };

  const handlePrivateChatColorChange = async (chat: PrivateChat, color: string) => {
    if (!id) return;
    const updated = await privateChatsApi.rename(Number(id), chat.id, chat.name, color);
    setPrivateChats((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    if (selectedPrivateChat?.id === updated.id) setSelectedPrivateChat(updated);
  };

  const handleAsk = async (noAi = false) => {
    if (!question.trim()) return;
    if (!selectedChannel && !selectedPrivateChat) return;
    const content = question.trim();
    setQuestion("");
    if (!noAi) setAsking(true);
    try {
      if (selectedChannel) {
        await messagesApi.send(selectedChannel.id, { content, noAi });
      } else if (selectedPrivateChat) {
        const { userMessage, aiMessage, sources } = await messagesApi.sendPrivate(
          selectedPrivateChat.id,
          { content },
        );
        setMessages((prev) => [...prev, userMessage, aiMessage]);
        if (sources?.length) {
          setSourceMap((prev) => ({ ...prev, [aiMessage.id]: sources }));
        }
        setAsking(false);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now(), content: "Error getting response.", isAi: true,
        channelId: selectedChannel?.id ?? null, privateChatId: selectedPrivateChat?.id ?? null,
        userId: 0, isPinned: false, createdAt: new Date().toISOString(), replies: [],
      } as Message]);
      setAsking(false);
    }
  };

  // Socket path: attach sources when the AI message arrives via socket
  const pendingSources = useRef<Source[] | null>(null);
  const handleAskChannel = async (noAi = false) => {
    if (!question.trim() || !selectedChannel) return;
    const content = question.trim();
    setQuestion("");
    if (!noAi) setAsking(true);
    try {
      const { aiMessage, sources } = await messagesApi.send(selectedChannel.id, { content, noAi });
      if (aiMessage?.id && sources?.length) {
        setSourceMap((prev) => ({ ...prev, [aiMessage.id]: sources }));
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now(), content: "Error getting response.", isAi: true,
        channelId: selectedChannel.id, privateChatId: null,
        userId: 0, isPinned: false, createdAt: new Date().toISOString(), replies: [],
      } as Message]);
      setAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (selectedChannel) {
      handleAskChannel(false);
    } else {
      handleAsk(false);
    }
  };

  const getMessageStyle = (msg: Message) => {
    if (msg.isAi) return "ai";
    if (msg.userId === currentUser?.id) return "own";
    return "other";
  };

  const activeColor = selectedChannel?.color || selectedPrivateChat?.color || null;
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
      <ChannelList
        channels={channels}
        privateChats={privateChats}
        selectedId={selectedChannel?.id}
        selectedPrivateChatId={selectedPrivateChat?.id}
        onSelect={(ch) => { setSelectedChannel(ch); setSelectedPrivateChat(null); }}
        onSelectPrivateChat={(chat) => { setSelectedPrivateChat(chat); setSelectedChannel(null); }}
        onDelete={isAdmin ? handleDeleteChannel : undefined}
        onRename={isAdmin ? openRenameDialog : undefined}
        onDeletePrivateChat={handleDeletePrivateChat}
        onRenamePrivateChat={openRenamePrivateChatDialog}
        onColorChange={isAdmin ? handleColorChange : undefined}
        onPrivateChatColorChange={handlePrivateChatColorChange}
        onCreate={openCreateDialog}
      />

      <div className="flex-1 relative overflow-hidden">
        {activeName ? (
          <>
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
            <div className="h-full overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {activeColor && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: activeColor }}
                    />
                  )}
                  # {activeName}
                </h2>
                {messagesLoading && <p className="text-muted-foreground text-sm">Loading messages...</p>}
                {!messagesLoading && messages.length === 0 && (
                  <p className="text-muted-foreground text-sm">No messages yet — ask something!</p>
                )}
                {messages.map((msg) => {
                  const style = getMessageStyle(msg);
                  const msgSources = sourceMap[msg.id];
                  const isSourceOpen = openSourceMsgId === msg.id;
                  const bubbleColor = activeColor ?? "hsl(var(--primary))";

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[75%] gap-1",
                        style === "own" ? "self-end items-end" : "self-start items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                          style === "ai" && "bg-transparent p-1 text-foreground",
                        )}
                        style={
                          style === "own"
                            ? { backgroundColor: bubbleColor, color: style === "own" ? "#fff" : undefined }
                            : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }
                        }
                      >
                        {msg.content}
                      </div>

                      <div className="flex items-center gap-1.5 px-1 relative">
                        {style !== "own" && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {style === "ai" ? "AI" : (msg.user?.name ?? `User #${msg.userId}`)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/60">{formatTime(msg.createdAt)}</span>

                        {/* Sources button — only shown on AI messages that have sources */}
                        {style === "ai" && msgSources?.length ? (
                          <div className="relative">
                            <button
                              onClick={() => setOpenSourceMsgId((prev) => prev === msg.id ? null : msg.id)}
                              className="flex items-center gap-0.5 text-xs transition-colors"
                              title="View sources"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span className="text-muted-foreground/70">{msgSources.length}</span>
                            </button>
                            {isSourceOpen && (
                              <SourcesPopover
                                sources={msgSources}
                                onClose={() => setOpenSourceMsgId(null)}
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {asking && (
                  <div className="self-start flex flex-col gap-1 items-start">
                    <div className="rounded-lg px-4 py-2 text-sm text-muted-foreground animate-pulse"
                      style={{ backgroundColor: (activeColor ?? "hsl(var(--primary))") + "18" }}
                    >
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
              <div className="max-w-2xl mx-auto pointer-events-auto">
                <div className="flex gap-2 items-center bg-background/80 backdrop-blur-sm border rounded-xl px-3 py-2 shadow-lg">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedPrivateChat ? "Ask AI something..." : "Message or ask AI..."}
                    className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent"
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
                    onClick={() => selectedChannel ? handleAskChannel(false) : handleAsk(false)}
                    disabled={asking || !question.trim()}
                    size="lg"
                    style={activeColor ? { backgroundColor: activeColor, borderColor: activeColor } : undefined}
                  >
                    {asking ? "Asking..." : "Ask AI"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No channels yet — create one to get started.</p>
          </div>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="p-6 w-80 space-y-4">
            <h2 className="text-lg font-semibold">{dialogTitle()}</h2>
            {dialogMode === "create" && isAdmin && (
              <div className="flex rounded-md border overflow-hidden text-sm">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={cn("flex-1 py-1.5 transition-colors", !isPrivate ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  Public
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={cn("flex-1 py-1.5 transition-colors", isPrivate ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  Private
                </button>
              </div>
            )}
            <Input
              autoFocus
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDialogSubmit()}
              placeholder={
                dialogMode === "renamePrivate" ? "Private chat name" :
                isPrivate ? "Private chat name" : "Channel name"
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDialogSubmit} disabled={!channelName.trim()}>
                {dialogMode === "create" ? "Create" : "Rename"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}