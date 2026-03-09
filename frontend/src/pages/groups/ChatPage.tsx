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

export function ChatPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const { user: currentUser, userLoading } = useAuth();

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

  const bottomRef = useRef<HTMLDivElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename">("create");
  const [channelName, setChannelName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

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
  }, [selectedChannel, selectedPrivateChat, userLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setChannelName("");
    setIsPrivate(false);
    setEditingChannel(null);
    setDialogOpen(true);
  };

  const openRenameDialog = (channel: Channel) => {
    setDialogMode("rename");
    setChannelName(channel.name);
    setEditingChannel(channel);
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

  const handleAsk = async (noAi = false) => {
    if (!question.trim()) return;
    if (!selectedChannel && !selectedPrivateChat) return;
    const content = question.trim();
    setQuestion("");
    if (!noAi) setAsking(true);
    try {
      if (selectedChannel) {
        const { userMessage, aiMessage } = await messagesApi.send(
          selectedChannel.id,
          { content, noAi },
        );
        setMessages((prev) => [
          ...prev,
          userMessage,
          ...(aiMessage ? [aiMessage] : []),
        ]);
      } else if (selectedPrivateChat) {
        const { userMessage, aiMessage } = await messagesApi.sendPrivate(
          selectedPrivateChat.id,
          { content },
        );
        setMessages((prev) => [...prev, userMessage, aiMessage]);
      }
    } catch {
      // error handling unchanged
    } finally {
      setAsking(false);
    }
  };

  const getMessageStyle = (msg: Message) => {
    if (msg.isAi) return "ai";
    if (msg.userId === currentUser?.id) return "own";
    return "other";
  };

  const activeName = selectedChannel?.name ?? selectedPrivateChat?.name ?? null;

  if (loading || channelsLoading || userLoading) return <div></div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="flex h-full overflow-hidden">
      <ChannelList
        channels={channels}
        privateChats={privateChats}
        selectedId={selectedChannel?.id}
        selectedPrivateChatId={selectedPrivateChat?.id}
        onSelect={(ch) => {
          setSelectedChannel(ch);
          setSelectedPrivateChat(null);
        }}
        onSelectPrivateChat={(chat) => {
          setSelectedPrivateChat(chat);
          setSelectedChannel(null);
        }}
        onDelete={handleDeleteChannel}
        onDeletePrivateChat={handleDeletePrivateChat}
        onRename={openRenameDialog}
        onCreate={openCreateDialog}
      />

      <div className="flex-1 relative overflow-hidden">
        {activeName ? (
          <>
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

            <div className="h-full overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-4">
                <h2 className="text-lg font-semibold"># {activeName}</h2>

                {messagesLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading messages...
                  </p>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No messages yet — ask something!
                  </p>
                )}

                {messages.map((msg) => {
                  const style = getMessageStyle(msg);
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
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                          style === "own" &&
                            "bg-channel text-primary-foreground",
                          style === "other" && "bg-muted text-foreground",
                          style === "ai" &&
                            "bg-transparent p-1 text-foreground",
                        )}
                      >
                        {msg.content}
                      </div>

                      <div className="flex items-center gap-1.5 px-1">
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
                      </div>
                    </div>
                  );
                })}

                {asking && (
                  <div className="self-start flex flex-col gap-1 items-start">
                    <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground animate-pulse">
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
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleAsk(false)
                    }
                    placeholder={
                      selectedPrivateChat
                        ? "Ask AI something..."
                        : "Message or ask AI..."
                    }
                    className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent"
                    disabled={asking}
                  />
                  {selectedChannel && (
                    <Button
                      variant="outline"
                      onClick={() => handleAsk(true)}
                      disabled={asking || !question.trim()}
                      size="lg"
                    >
                      Send
                    </Button>
                  )}
                  <Button
                    variant="channel"
                    onClick={() => handleAsk(false)}
                    disabled={asking || !question.trim()}
                    size="lg"
                  >
                    {asking ? "Asking..." : "Ask AI"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">
              No channels yet — create one to get started.
            </p>
          </div>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="p-6 w-80 space-y-4">
            <h2 className="text-lg font-semibold">
              {dialogMode === "create" ? "New Channel" : "Rename Channel"}
            </h2>
            {dialogMode === "create" && (
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
            <Input
              autoFocus
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDialogSubmit()}
              placeholder={isPrivate ? "Private chat name" : "Channel name"}
            />
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
