export interface Comment {
  commentId: number;
  cardId: number;
  authorId: number;
  // Populated by the backend from the Auth service so the UI never has to fall
  // back to "User #id". May be null if the Auth lookup fails.
  authorEmail?: string;
  authorName?: string;
  content: string;
  parentCommentId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  replyCount?: number;
  replies?: Comment[];
  editing?: boolean;
  replying?: boolean;
}
