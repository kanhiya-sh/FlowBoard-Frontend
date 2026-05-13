export type CardPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CardStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export interface Card {
  cardId: number;
  listId: number;
  boardId: number;
  title: string;
  description?: string;
  position: number;
  priority: CardPriority;
  status: CardStatus;
  dueDate?: string | null;
  startDate?: string | null;
  assigneeId?: number | null;
  createdById?: number;
  isArchived?: boolean;
  coverColor?: string | null;
  createdAt?: string;
  updatedAt?: string;
  labels?: { labelId: number; name: string; color: string }[];
  commentCount?: number;
  checklistProgress?: { completed: number; total: number };
}
