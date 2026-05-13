export interface ChecklistItem {
  itemId: number;
  checklistId: number;
  text: string;
  isCompleted: boolean;
  assigneeId?: number | null;
  dueDate?: string | null;
}
