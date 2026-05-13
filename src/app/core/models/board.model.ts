export type BoardVisibility = 'PUBLIC' | 'PRIVATE';
export type BoardRole = 'OBSERVER' | 'MEMBER' | 'ADMIN';

export interface Board {
  boardId: number;
  workspaceId: number;
  name: string;
  description?: string;
  background?: string;
  visibility: BoardVisibility;
  createdById: number;
  isClosed?: boolean;
  createdAt?: string;
}

export interface BoardMember {
  userId: number;
  fullName?: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  role: BoardRole;
}
