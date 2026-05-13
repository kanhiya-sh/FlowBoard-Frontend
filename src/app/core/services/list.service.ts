import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TaskList } from '../models/list.model';

@Injectable({ providedIn: 'root' })
export class ListService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  createList(body: { boardId: number; name: string; color?: string }): Observable<TaskList> {
    return this.http.post<TaskList>(`${this.base}/lists`, body);
  }

  getListsByBoard(boardId: number): Observable<TaskList[]> {
    return this.http.get<TaskList[]>(`${this.base}/lists/board/${boardId}`);
  }

  getList(listId: number): Observable<TaskList> {
    return this.http.get<TaskList>(`${this.base}/lists/${listId}`);
  }

  updateList(listId: number, body: { boardId: number; name: string; color?: string }): Observable<TaskList> {
    return this.http.put<TaskList>(`${this.base}/lists/${listId}`, body);
  }

  deleteList(listId: number): Observable<string> {
    return this.http.delete(`${this.base}/lists/${listId}`, { responseType: 'text' });
  }

  reorderLists(boardId: number, orderedListIds: number[]): Observable<TaskList[]> {
    return this.http.put<TaskList[]>(`${this.base}/lists/board/${boardId}/reorder`, { orderedListIds });
  }

  archiveList(listId: number): Observable<TaskList> {
    return this.http.post<TaskList>(`${this.base}/lists/${listId}/archive`, {});
  }

  unarchiveList(listId: number): Observable<TaskList> {
    return this.http.post<TaskList>(`${this.base}/lists/${listId}/unarchive`, {});
  }

  getArchivedLists(boardId: number): Observable<TaskList[]> {
    return this.http.get<TaskList[]>(`${this.base}/lists/board/${boardId}/archived`);
  }
}
