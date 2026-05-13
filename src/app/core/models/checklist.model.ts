import { ChecklistItem } from './checklist-item.model';

export interface Checklist {
  checklistId: number;
  cardId: number;
  title: string;
  position: number;
  items: ChecklistItem[];
  _newItem?: string;
}

export interface ChecklistProgress {
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
}
