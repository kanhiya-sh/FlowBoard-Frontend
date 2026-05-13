export type NotificationType = 'ASSIGNMENT' | 'MENTION' | 'DUE_DATE' | 'COMMENT' | 'MOVE' | string;

export interface Notification {
  notificationId: number;
  recipientId: number;
  actorId?: number;
  type: NotificationType;
  message: string;
  title?: string;
  relatedId?: number;
  relatedType?: string;
  isRead: boolean;
  createdAt?: string;
}
