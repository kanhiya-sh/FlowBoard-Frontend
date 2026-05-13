export type WorkspaceVisibility = 'PUBLIC' | 'PRIVATE';
export type WorkspaceRole = 'ADMIN' | 'MEMBER';

export interface Workspace {
  workspaceId: number;
  name: string;
  description?: string;
  ownerId: number;
  visibility: WorkspaceVisibility;
  logoUrl?: string;
  createdAt?: string;
  memberCount?: number;
}

export interface WorkspaceMember {
  userId: number;
  fullName?: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  role: WorkspaceRole;
}
