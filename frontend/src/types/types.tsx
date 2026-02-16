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