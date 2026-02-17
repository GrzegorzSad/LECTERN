import type {
  AskDto,
  CreateUserDto,
  LoginDto,
  CreateChunksDto,
  CreateGroupDto,
  Group,
  GptAskResponse
} from "../types/types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
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
    request("/Groups", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: CreateGroupDto) =>
    request(`/Groups/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request(`/Groups/${id}`, { method: "DELETE" }),
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

// --- Gpt ---
export const gptApi = {
  ask: (query: string) =>
    request<GptAskResponse>("/gpt/ask", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
};

// --- Documents ---
export const documentsApi = {
  upload: (formData: FormData) =>
    request("/documents/upload", { method: "POST", body: formData }),
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
    return request(`/documents/list${query}`, { method: "GET" });
  },
};
