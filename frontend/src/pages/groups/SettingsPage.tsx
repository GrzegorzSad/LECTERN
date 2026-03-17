import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { groupsApi, channelsApi } from "../../api/client";
import { useGroup } from "./GroupLayout";
import { useGroups } from "../../context/GroupsContext";
import type { Channel } from "../../types/types";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { ChevronDown, ChevronRight } from "lucide-react";

const PERSONALITIES = [
  { value: "", label: "Default" },
  {
    value: "You are a formal academic assistant. Use precise, professional language.",
    label: "Formal",
  },
  {
    value: "Be extremely concise. Answer in as few words as possible.",
    label: "Concise",
  },
  {
    value: "You are friendly and encouraging. Use simple, approachable language.",
    label: "Friendly",
  },
  {
    value:
      "You are a Socratic tutor. Guide the user to answers with questions rather than stating them directly.",
    label: "Socratic",
  },
];

// ---------------------------------------------------------------------------
// Shared section wrapper — mirrors the bordered bg-background blocks
// ---------------------------------------------------------------------------

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI settings form
// ---------------------------------------------------------------------------

function AiSettingsForm({
  initialPrompt,
  initialPersonality,
  onSave,
  saving,
}: {
  initialPrompt: string;
  initialPersonality: string;
  onSave: (prompt: string, personality: string) => void;
  saving: boolean;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [personality, setPersonality] = useState(initialPersonality);
  const [savedPrompt, setSavedPrompt] = useState(initialPrompt);
  const [savedPersonality, setSavedPersonality] = useState(initialPersonality);

  useEffect(() => {
    setPrompt(initialPrompt);
    setPersonality(initialPersonality);
    setSavedPrompt(initialPrompt);
    setSavedPersonality(initialPersonality);
  }, [initialPrompt, initialPersonality]);

  const isDirty = prompt !== savedPrompt || personality !== savedPersonality;

  const handleSave = () => {
    onSave(prompt, personality);
    setSavedPrompt(prompt);
    setSavedPersonality(personality);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Personality</p>
        <div className="flex flex-wrap gap-2">
          {PERSONALITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPersonality(p.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                personality === p.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {!PERSONALITIES.find((p) => p.value === personality) && (
          <Input
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Custom personality prompt..."
            className="text-xs mt-2"
          />
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Custom Prompt
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Add extra instructions for the AI in this context..."
          className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          rows={3}
        />
      </div>

      {isDirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const { id } = useParams();
  const { group, loading, error } = useGroup();
  const { removeGroup } = useGroups();
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingChannelId, setSavingChannelId] = useState<number | null>(null);
  const [expandedChannelId, setExpandedChannelId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    channelsApi.list(Number(id)).then(setChannels);
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await groupsApi.remove(Number(id));
      removeGroup(Number(id));
      navigate("/", { replace: true });
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const handleSaveGroupAi = async (aiPrompt: string, aiPersonality: string) => {
    if (!id) return;
    setSavingGroup(true);
    try {
      await groupsApi.updateAiSettings(Number(id), { aiPrompt, aiPersonality });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleSaveChannelAi = async (
    channel: Channel,
    aiPrompt: string,
    aiPersonality: string,
  ) => {
    if (!id) return;
    setSavingChannelId(channel.id);
    try {
      await channelsApi.updateAiSettings(Number(id), channel.id, {
        aiPrompt,
        aiPersonality,
      });
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channel.id ? { ...c, aiPrompt, aiPersonality } : c,
        ),
      );
    } finally {
      setSavingChannelId(null);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error || !group) return <div>Group not found</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 bg-sidebar rounded-lg">
      {/* Group AI settings */}
      <Section
        title="Group AI Settings"
        description="These apply to all channels unless overridden at the channel level."
      >
        <AiSettingsForm
          initialPrompt={group.aiPrompt ?? ""}
          initialPersonality={group.aiPersonality ?? ""}
          onSave={handleSaveGroupAi}
          saving={savingGroup}
        />
      </Section>

      {/* Per-channel AI settings */}
      {channels.length > 0 && (
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">Channel AI Settings</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Channel settings override group defaults.
            </p>
          </div>
          {channels.map((channel) => {
            const isExpanded = expandedChannelId === channel.id;
            return (
              <div key={channel.id} className="border-b last:border-b-0">
                <button
                  onClick={() =>
                    setExpandedChannelId((prev) =>
                      prev === channel.id ? null : channel.id,
                    )
                  }
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium"># {channel.name}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <AiSettingsForm
                      initialPrompt={channel.aiPrompt ?? ""}
                      initialPersonality={channel.aiPersonality ?? ""}
                      onSave={(prompt, personality) =>
                        handleSaveChannelAi(channel, prompt, personality)
                      }
                      saving={savingChannelId === channel.id}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Danger zone */}
      <div className="overflow-hidden rounded-md border border-destructive/30 bg-background">
        <div className="px-4 py-3 border-b border-destructive/30">
          <p className="text-sm font-medium text-destructive">Danger Zone</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deleting this group is permanent and cannot be undone. All channels,
            messages and files will be removed.
          </p>
        </div>
        <div className="px-4 py-3">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              Delete Group
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}