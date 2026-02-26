import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { channelsApi, messagesApi } from "../../api/client";
import type { Channel, Message } from "../../types/types";
import { Card } from "../../components/card";
import { Button } from "../../components/button";
import { useGroup } from "./GroupLayout";
import { ChannelList } from "../../components/channel-list";
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename">("create");
  const [channelName, setChannelName] = useState("");
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  useEffect(() => {
    if (!id) return;
    channelsApi
      .list(Number(id))
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0]);
      })
      .finally(() => setChannelsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedChannel) return;
    setMessagesLoading(true);
    setMessages([]);
    messagesApi
      .list(selectedChannel.id)
      .then(setMessages)
      .finally(() => setMessagesLoading(false));
  }, [selectedChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const newChannel = await channelsApi.create(Number(id), {
        name: channelName.trim(),
      });
      setChannels((prev) => [...prev, newChannel]);
      setSelectedChannel(newChannel);
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
      const { userMessage, aiMessage } = await messagesApi.send(
        selectedChannel.id,
        { content },
      );
      setMessages((prev) => [...prev, userMessage, aiMessage]);
    } catch {
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

  if (loading || channelsLoading) return <div></div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Channel sidebar */}
      <ChannelList
        channels={channels}
        selectedId={selectedChannel?.id}
        onSelect={setSelectedChannel}
        onDelete={handleDeleteChannel}
        onRename={openRenameDialog}
        onCreate={openCreateDialog}
      />

      {/* Chat area — flex-1 so it fills remaining space, centers content inside */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChannel ? (
          <>
            {/* Scrollable message area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
                <h2 className="text-lg font-semibold"># {selectedChannel.name}</h2>

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
                      "flex flex-col max-w-[75%] gap-1",
                      msg.isAi ? "self-start items-start" : "self-end items-end",
                    )}
                  >
                    <span className="text-xs text-muted-foreground px-1">
                      {msg.isAi ? "AI" : (msg.user?.name ?? `User #${msg.userId}`)}
                    </span>
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                        msg.isAi
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {asking && (
                  <div className="self-start flex flex-col gap-1 items-start">
                    <span className="text-xs text-muted-foreground px-1">AI</span>
                    <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground animate-pulse">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input — also centered and max-width constrained */}
            <div className="shrink-0 bg-background">
              <div className="max-w-2xl mx-auto px-4 py-2 flex gap-2">
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">
              No channels yet — create one to get started.
            </p>
          </div>
        )}
      </div>

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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
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