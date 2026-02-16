export interface AskDto {
  query: string;
}

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

export interface CreateChunksDto {}

export interface CreateGroupDto {
  name: string;
  img?: string;
}

export interface Group {
  id: number;
  name: string;
  img?: string;
}

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
  userId: number;
  groupId: number;
  sourceId?: number | null;
  remoteId?: string | null;
  isLinked?: boolean;
  createdAt: string; 
  updatedAt: string; 
}