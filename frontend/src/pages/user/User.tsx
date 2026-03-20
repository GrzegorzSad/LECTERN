import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  authApi,
  linkedAccountsApi,
  usersApi,
  privateChatsApi,
  groupsApi,
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { PrivateChat, Group } from "../../types/types";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { LogOut, Link2, Unlink, ChevronDown, ChevronRight } from "lucide-react";
import type { User } from "../../types/types";

interface LinkedAccount {
  id: number;
  provider: string;
  email?: string;
}

const ALL_PROVIDERS = [
  {
    id: "microsoft",
    label: "Microsoft / OneDrive",
    icon: "🪟",
    onConnect: () => linkedAccountsApi.redirectToMicrosoft(),
  },
];

const PERSONALITIES = [
  { value: "", label: "Default" },
  {
    value:
      "You are a formal academic assistant. Use precise, professional language.",
    label: "Formal",
  },
  {
    value: "Be extremely concise. Answer in as few words as possible.",
    label: "Concise",
  },
  {
    value:
      "You are friendly and encouraging. Use simple, approachable language.",
    label: "Friendly",
  },
  {
    value:
      "You are a Socratic tutor. Guide the user to answers with questions rather than stating them directly.",
    label: "Socratic",
  },
];

// ---------------------------------------------------------------------------
// Shared section wrapper
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
// Collapsible sub-section within a card
// ---------------------------------------------------------------------------

function CollapsibleRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-2 text-left group"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
      </button>
      {open && <div className="pb-2">{children}</div>}
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
          placeholder="Add extra instructions for the AI..."
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

interface GroupWithChats {
  group: Group;
  chats: PrivateChat[];
}

export function UserPage() {
  const { user, setUser, userLoading } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<number | null>(null);

  const [groupsWithChats, setGroupsWithChats] = useState<GroupWithChats[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [expandedChatId, setExpandedChatId] = useState<number | null>(null);

  const [savingUser, setSavingUser] = useState(false);
  const [savingChatId, setSavingChatId] = useState<number | null>(null);

  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await linkedAccountsApi.list();
      setAccounts(data as LinkedAccount[]);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!user) return;
    setNewName(user.name ?? "");
    groupsApi
      .getAll()
      .then(async (groups: Group[]) => {
        const results = await Promise.all(
          groups.map(async (group) => {
            const chats = await privateChatsApi.list(group.id).catch(() => []);
            return { group, chats };
          }),
        );
        setGroupsWithChats(results.filter((r) => r.chats.length > 0));
      })
      .finally(() => setChatsLoading(false));
  }, [user]);

  const handleUnlink = async (id: number) => {
    setUnlinkingId(id);
    try {
      await linkedAccountsApi.unlink(id);
      await loadAccounts();
    } finally {
      setUnlinkingId(null);
      setConfirmUnlinkId(null);
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    navigate("/login", { replace: true });
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      const updated = (await usersApi.updateName(newName.trim())) as User;
      setUser(updated);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await usersApi.updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message ?? "Incorrect current password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveUserAi = async (aiPrompt: string, aiPersonality: string) => {
    setSavingUser(true);
    try {
      await usersApi.updateAiSettings({ aiPrompt, aiPersonality });
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveChatAi = async (
    groupId: number,
    chat: PrivateChat,
    aiPrompt: string,
    aiPersonality: string,
  ) => {
    setSavingChatId(chat.id);
    try {
      await privateChatsApi.updateAiSettings(groupId, chat.id, {
        aiPrompt,
        aiPersonality,
      });
      setGroupsWithChats((prev) =>
        prev.map((g) =>
          g.group.id === groupId
            ? {
                ...g,
                chats: g.chats.map((c) =>
                  c.id === chat.id ? { ...c, aiPrompt, aiPersonality } : c,
                ),
              }
            : g,
        ),
      );
    } finally {
      setSavingChatId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 bg-sidebar rounded-lg">
      {/* Profile header */}
      <div className="overflow-hidden rounded-md border bg-background">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button size="sm" variant="destructive" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Log out
          </Button>
        </div>
      </div>

      {/* Linked accounts */}
      <div className="overflow-hidden rounded-md border bg-background">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium">Linked Accounts</p>
        </div>
        {accountsLoading ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Loading...</p>
        ) : (
          ALL_PROVIDERS.map((provider, i) => {
            const linked = accounts.find((a) => a.provider === provider.id);
            return (
              <div
                key={provider.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${
                  i !== ALL_PROVIDERS.length - 1 ? "border-b" : ""
                }`}
              >
                <span className="text-lg shrink-0">{provider.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{provider.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {linked ? (linked.email ?? "Connected") : "Not connected"}
                  </p>
                </div>
                {linked ? (
                  confirmUnlinkId === linked.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        Unlink?
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={unlinkingId === linked.id}
                        onClick={() => handleUnlink(linked.id)}
                      >
                        {unlinkingId === linked.id ? "..." : "Yes"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmUnlinkId(null)}
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmUnlinkId(linked.id)}
                    >
                      <Unlink className="h-3.5 w-3.5 mr-1.5" />
                      Unlink
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    onClick={provider.onConnect}
                    className="shrink-0"
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    Link
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Account */}
      <div className="overflow-hidden rounded-md border bg-background">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium">Account Settings</p>
        </div>

        <div className="px-4 pt-2 pb-1 divide-y divide-border">
          {/* Display name — collapsible */}
          <CollapsibleRow label="Display Name">
            <div className="flex gap-2 pt-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Your name"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={savingName || newName.trim() === user.name}
              >
                {savingName ? "Saving..." : nameSuccess ? "Saved ✓" : "Save"}
              </Button>
            </div>
            {nameError && (
              <p className="text-xs text-destructive mt-1.5">{nameError}</p>
            )}
          </CollapsibleRow>

          {/* Change password — collapsible */}
          <CollapsibleRow label="Change Password">
            <div className="space-y-2 pt-1">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
              />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) => e.key === "Enter" && handleSavePassword()}
              />
              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-green-600">Password updated ✓</p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSavePassword}
                  disabled={
                    savingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </CollapsibleRow>
        </div>
      </div>

      {/* User AI settings */}
      <Section
        title="Your AI Settings"
        description="Default settings for your private chats, unless overridden per chat."
      >
        {userLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : (
          <AiSettingsForm
            initialPrompt={user.aiPrompt ?? ""}
            initialPersonality={user.aiPersonality ?? ""}
            onSave={handleSaveUserAi}
            saving={savingUser}
          />
        )}
      </Section>

      {/* Private chat AI settings */}
      {!chatsLoading && groupsWithChats.length > 0 && (
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">Private Chat AI Settings</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Override your default AI settings per chat.
            </p>
          </div>
          {groupsWithChats.map(({ group, chats }) => (
            <div key={group.id}>
              <div className="px-4 py-2 border-b bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.name}
                </p>
              </div>
              {chats.map((chat) => {
                const isExpanded = expandedChatId === chat.id;
                return (
                  <div key={chat.id} className="border-b last:border-b-0">
                    <button
                      onClick={() =>
                        setExpandedChatId((prev) =>
                          prev === chat.id ? null : chat.id,
                        )
                      }
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-medium">
                        🔒 {chat.name}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <AiSettingsForm
                          initialPrompt={chat.aiPrompt ?? ""}
                          initialPersonality={chat.aiPersonality ?? ""}
                          onSave={(prompt, personality) =>
                            handleSaveChatAi(
                              group.id,
                              chat,
                              prompt,
                              personality,
                            )
                          }
                          saving={savingChatId === chat.id}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
