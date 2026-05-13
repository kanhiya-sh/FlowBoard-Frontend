import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Checklist, ChecklistProgress } from '../models/checklist.model';
import { ChecklistItem } from '../models/checklist-item.model';

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  createChecklist(body: { cardId: number; title: string }): Observable<Checklist> {
    return this.http.post<Checklist>(`${this.base}/checklists`, body);
  }

  getChecklistsByCard(cardId: number): Observable<Checklist[]> {
    return this.http.get<Checklist[]>(`${this.base}/checklists/card/${cardId}`);
  }

  deleteChecklist(checklistId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/checklists/${checklistId}`);
  }

  getProgress(checklistId: number): Observable<ChecklistProgress> {
    return this.http.get<ChecklistProgress>(`${this.base}/checklists/${checklistId}/progress`);
  }

  addItem(body: { checklistId: number; text: string; assigneeId?: number | null; dueDate?: string | null }): Observable<ChecklistItem> {
    return this.http.post<ChecklistItem>(`${this.base}/checklists/items`, body);
  }

  toggleItem(itemId: number): Observable<ChecklistItem> {
    return this.http.put<ChecklistItem>(`${this.base}/checklists/items/${itemId}/toggle`, {});
  }

  updateItem(itemId: number, body: { text: string; assigneeId?: number | null; dueDate?: string | null }): Observable<ChecklistItem> {
    return this.http.put<ChecklistItem>(`${this.base}/checklists/items/${itemId}`, body);
  }

  deleteItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/checklists/items/${itemId}`);
  }
}
