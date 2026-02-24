import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { channelsApi, messagesApi } from "../../api/client";
import type { Channel, Message } from "../../types/types";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useGroup } from "./GroupLayout";
import { ChannelList } from "../../components/ui/channel-list";
import { cn } from "../../lib/utils";

export function ChatPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelsLoading, setChannelsLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename">("create");
  const [channelName, setChannelName] = useState("");
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  // Load channels on mount
  useEffect(() => {
    if (!id) return;
    channelsApi.list(Number(id)).then((data) => {
      setChannels(data);
      if (data.length > 0) setSelectedChannel(data[0]);
    }).finally(() => setChannelsLoading(false));
  }, [id]);

  // Load messages when selected channel changes
  useEffect(() => {
    if (!selectedChannel) return;
    setMessagesLoading(true);
    setMessages([]);
    messagesApi.list(selectedChannel.id)
      .then(setMessages)
      .finally(() => setMessagesLoading(false));
  }, [selectedChannel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setChannelName("");
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
      const newChannel = await channelsApi.create(Number(id), { name: channelName.trim() });
      setChannels((prev) => [...prev, newChannel]);
      setSelectedChannel(newChannel);
    } else if (dialogMode === "rename" && editingChannel) {
      const updated = await channelsApi.update(Number(id), editingChannel.id, { name: channelName.trim() });
      setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedChannel?.id === updated.id) setSelectedChannel(updated);
    }
    setDialogOpen(false);
    setChannelName("");
  };

  const handleDeleteChannel = async (channel: Channel) => {
    if (!id) return;
    await channelsApi.remove(Number(id), channel.id);
    const remaining = channels.filter((c) => c.id !== channel.id);
    setChannels(remaining);
    if (selectedChannel?.id === channel.id) {
      setSelectedChannel(remaining[0] ?? null);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !selectedChannel) return;
    const content = question.trim();
    setQuestion("");
    setAsking(true);
    try {
      // sendMessage saves user msg + AI response and returns both
      const { userMessage, aiMessage } = await messagesApi.send(selectedChannel.id, { content });
      setMessages((prev) => [...prev, userMessage, aiMessage]);
    } catch {
      // Append a local error message so the user sees feedback
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content: "Error getting response.",
          isAi: true,
          channelId: selectedChannel.id,
          userId: 0,
          isPinned: false,
          createdAt: new Date().toISOString(),
          replies: [],
        } as Message,
      ]);
    } finally {
      setAsking(false);
    }
  };

  if (loading || channelsLoading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Channel sidebar */}
      <Card className="w-52 shrink-0 p-3 flex flex-col">
        <ChannelList
          channels={channels}
          selectedId={selectedChannel?.id}
          onSelect={handleSelectChannel}
          onDelete={handleDeleteChannel}
          onRename={openRenameDialog}
          onCreate={openCreateDialog}
        />
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
        {selectedChannel ? (
          <>
            <h2 className="text-lg font-semibold shrink-0"># {selectedChannel.name}</h2>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {messagesLoading && (
                <p className="text-muted-foreground text-sm">Loading messages...</p>
              )}
              {!messagesLoading && messages.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No messages yet — ask something!
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                    msg.isAi
                      ? "self-start bg-muted text-foreground"
                      : "self-end bg-primary text-primary-foreground"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {asking && (
                <div className="self-start bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground animate-pulse">
                  Thinking...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 shrink-0">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
                placeholder="Ask something about these files..."
                className="flex-1 border rounded px-3 py-2 text-sm"
                disabled={asking}
              />
              <Button onClick={handleAsk} disabled={asking || !question.trim()}>
                {asking ? "Asking..." : "Send"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">
            No channels yet — create one to get started.
          </p>
        )}
      </Card>

      {/* Create / Rename dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="p-6 w-80 space-y-4">
            <h2 className="text-lg font-semibold">
              {dialogMode === "create" ? "New Channel" : "Rename Channel"}
            </h2>
            <input
              autoFocus
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDialogSubmit()}
              placeholder="Channel name"
              className="w-full border rounded px-3 py-2"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
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