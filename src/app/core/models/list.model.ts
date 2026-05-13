import { Card } from './card.model';

export interface TaskList {
  listId: number;
  boardId: number;
  name: string;
  position: number;
  color?: string;
  isArchived?: boolean;
  createdAt?: string;
  cards?: Card[];
  editing?: boolean;
  _menuOpen?: boolean;
}
