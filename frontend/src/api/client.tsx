import type {
  GptAskDto,
  GptAskResponse,
  CreateUserDto,
  LoginDto,
  CreateChunksDto,
  CreateGroupDto,
  CreateMemberDto,
  UpdateMemberRoleDto,
  CreateChannelDto,
  CreateMessageDto,
  Group,
  Channel,
  Message,
  Member,
  Document,
  Source,
  PrivateChat,
} from "../types/types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 403) {
    window.location.href = "/unauthorized";
    return Promise.reject(new Error("Forbidden"));
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// --- Auth ---
export const authApi = {
  register: (data: CreateUserDto) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: LoginDto) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
};

// --- Users ---
export const usersApi = {
  getAll: () => request("/users"),
};

// --- Groups ---
export const groupsApi = {
  getAll: () => request<Group[]>("/Groups"),
  get: (id: number) => request<Group>(`/Groups/${id}`),
  create: (data: CreateGroupDto) =>
    request<Group>("/Groups", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateGroupDto>) =>
    request<Group>(`/Groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  remove: (id: number) => request(`/Groups/${id}`, { method: "DELETE" }),
  updateAiSettings: (
    id: number,
    data: { aiPrompt?: string; aiPersonality?: string },
  ) =>
    request(`/groups/${id}/ai-settings`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  generateInvite: (id: number) =>
    request<{ token: string }>(`/Groups/${id}/invite`, { method: "POST" }),
  joinByToken: (token: string) =>
    request<Group>(`/Groups/join/${token}`, { method: "POST" }),
};

// --- Members ---
export const membersApi = {
  add: (data: CreateMemberDto) =>
    request<Member>("/members", { method: "POST", body: JSON.stringify(data) }),
  list: (groupId: number) => request<Member[]>(`/members/${groupId}`),
  getMyRole: (groupId: number) =>
    request<{ role: "OWNER" | "ADMIN" | "MEMBER" }>(
      `/members/me/role?groupId=${groupId}`,
    ),
  updateRole: (memberId: number, role: string) =>
    request(`/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  remove: (memberId: number) =>
    request(`/members/${memberId}`, { method: "DELETE" }),
};

// --- Channels ---
export const channelsApi = {
  create: (groupId: number, data: CreateChannelDto) =>
    request<Channel>(`/groups/${groupId}/channels`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  list: (groupId: number) => request<Channel[]>(`/groups/${groupId}/channels`),
  update: (
    groupId: number,
    channelId: number,
    data: Partial<CreateChannelDto>,
  ) =>
    request<Channel>(`/groups/${groupId}/channels/${channelId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateAiSettings: (
    groupId: number,
    channelId: number,
    data: { aiPrompt?: string; aiPersonality?: string },
  ) =>
    request(`/groups/${groupId}/channels/${channelId}/ai-settings`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  remove: (groupId: number, channelId: number) =>
    request(`/groups/${groupId}/channels/${channelId}`, { method: "DELETE" }),
};

// --- Messages ---
export const messagesApi = {
  send: (channelId: number, data: CreateMessageDto) =>
    request<{ userMessage: Message; aiMessage: Message }>(
      `/channels/${channelId}/messages`,
      { method: "POST", body: JSON.stringify(data) },
    ),
  list: (channelId: number) =>
    request<Message[]>(`/channels/${channelId}/messages`),
  remove: (channelId: number, messageId: number) =>
    request(`/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
    }),
  pin: (channelId: number, messageId: number) =>
    request<Message>(`/channels/${channelId}/messages/${messageId}/pin`, {
      method: "PATCH",
    }),
  listPrivate: (privateChatId: number) =>
    request<Message[]>(`/private-chats/${privateChatId}/messages`),
  sendPrivate: (privateChatId: number, data: { content: string }) =>
    request<{ userMessage: Message; aiMessage: Message }>(
      `/private-chats/${privateChatId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
};

// --- Private Chats ---
export const privateChatsApi = {
  create: (groupId: number, name: string) =>
    request<PrivateChat>(`/groups/${groupId}/private-chats`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  rename: (groupId: number, privateChatId: number, name: string) =>
    request<PrivateChat>(`/groups/${groupId}/private-chats/${privateChatId}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  list: (groupId: number) =>
    request<PrivateChat[]>(`/groups/${groupId}/private-chats`),
  remove: (groupId: number, privateChatId: number) =>
    request(`/groups/${groupId}/private-chats/${privateChatId}`, {
      method: "DELETE",
    }),
};

// --- Documents ---
export const documentsApi = {
  upload: (formData: FormData) =>
    fetch(`${BASE_URL}/documents/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then((r) => r.json()),
  link: (data: { groupId: number; sourceId?: number; link: string }) =>
    request("/documents/link", { method: "POST", body: JSON.stringify(data) }),
  storeChunks: (data: CreateChunksDto) =>
    request("/documents/chunks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (groupId?: number, userId?: number) => {
    const params = new URLSearchParams();
    if (groupId !== undefined) params.append("groupId", String(groupId));
    if (userId !== undefined) params.append("userId", String(userId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<Document[]>(`/documents/list${query}`);
  },
  remove: (id: number) => request(`/documents/${id}`, { method: "DELETE" }),
};

// --- Sources ---
export const sourcesApi = {
  getAll: () => request<Source[]>("/sources"),
  create: () => request<Source>("/sources", { method: "POST" }),
  remove: (id: number) => request(`/sources/${id}`, { method: "DELETE" }),
  getGroupSources: (groupId: number) =>
    request<Source[]>(`/sources/group/${groupId}`),
  addToGroup: (groupId: number, sourceId: number) =>
    request(`/sources/group/${groupId}/${sourceId}`, { method: "POST" }),
  removeFromGroup: (groupId: number, sourceId: number) =>
    request(`/sources/group/${groupId}/${sourceId}`, { method: "DELETE" }),
};

// --- OneDrive ---
export const oneDriveApi = {
  listFiles: (folderId?: string, type: "all" | "files" | "folders" = "all") =>
    request(`/onedrive/list?folderId=${folderId || ""}&type=${type}`),
  getMetadata: (itemId: string) => request(`/onedrive/metadata/${itemId}`),
};

// --- Linked Accounts ---
export const linkedAccountsApi = {
  list: () => request("/linked-accounts"),
  redirectToMicrosoft: () => {
    window.location.href = `${BASE_URL}/linked-accounts/microsoft/connect`;
  },
  microsoftCallback: () => request("/linked-accounts/microsoft/callback"),
  unlink: (id: number) =>
    request(`/linked-accounts/${id}`, { method: "DELETE" }),
};

// --- GPT ---
export const gptApi = {
  ask: (dto: GptAskDto) =>
    request<GptAskResponse>("/gpt/ask", {
      method: "POST",
      body: JSON.stringify(dto),
    }),
};
