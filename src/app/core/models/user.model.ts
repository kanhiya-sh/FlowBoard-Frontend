export interface User {
  userId: number;
  fullName: string;
  email: string;
  username: string;
  role: string;
  avatarUrl?: string | null;
  isActive?: boolean;
}

export interface AuthResponse extends User {
  token: string;
}
