// --- Auth ---
export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  img?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// --- Users ---
export interface User {
  id: number;
  name: string;
  email: string;
  img?: string;
}

// --- Groups ---
export interface CreateGroupDto {
  name: string;
  img?: string;
}

export interface Group {
  id: number;
  name: string;
  img?: string;
}

// --- Members ---
export interface CreateMemberDto {
  groupId: number;
  userId: number;
  role: string;
}

export interface UpdateMemberRoleDto {
  role: string;
}

export interface Member {
  id: number;
  groupId: number;
  userId: number;
  role: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

// --- Channels ---
export interface CreateChannelDto {
  name: string;
}

export interface Channel {
  id: number;
  name: string;
  groupId: number;
}

// --- Messages ---
export interface CreateMessageDto {
  content: string;
  parentMessageId?: number;
}

export interface Message {
  id: number;
  content: string;
  isAi: boolean;
  isPinned: boolean;
  channelId: number;
  userId: number;
  parentMessageId?: number | null;
  createdAt: string;
  replies?: Message[];
  user?: {
    id: number;
    name: string;
  };
}

// --- Documents ---
export interface GetDocumentsDto {
  groupId?: number;
  userId?: number;
}

export interface Document {
  id: number;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  groupId: number;
  userId: number;
  isLinked?: boolean;
  sourceId?: number | null;
  remoteId?: string | null;
  info: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChunksDto {
  fileId: number;
  chunks: string[];
  vectors: number[][];
  fileNames?: string[];
  relations?: string[];
  entities?: string[];
}

// --- Sources ---
export interface Source {
  id: number;
  name: string;
}

// --- GPT ---
export interface GptAskDto {
  query: string;
  groupId: number;
  channelId?: number;
}

export interface GptAskResponse {
  answer: string;
  chunks: {
    preview: string;
  }[];
}