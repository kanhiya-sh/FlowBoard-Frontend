import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Card, CardPriority, CardStatus } from '../models/card.model';

@Injectable({ providedIn: 'root' })
export class CardService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  createCard(body: { listId: number; boardId: number; title: string; description?: string; priority?: CardPriority; status?: CardStatus; dueDate?: string | null; startDate?: string | null; coverColor?: string | null; assigneeId?: number | null }): Observable<Card> {
    return this.http.post<Card>(`${this.base}/cards`, body);
  }

  getCard(cardId: number): Observable<Card> {
    return this.http.get<Card>(`${this.base}/cards/${cardId}`);
  }

  getCardsByList(listId: number): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.base}/cards/list/${listId}`);
  }

  getCardsByBoard(boardId: number): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.base}/cards/board/${boardId}`);
  }

  updateCard(cardId: number, body: Partial<Card>): Observable<Card> {
    return this.http.put<Card>(`${this.base}/cards/${cardId}`, body);
  }

  deleteCard(cardId: number): Observable<void> {
    // Backend requires archive before permanent delete — chain archive → delete
    return this.archiveCard(cardId).pipe(
      switchMap(() => this.http.delete<void>(`${this.base}/cards/${cardId}`))
    );
  }

  moveCard(cardId: number, body: { targetListId: number; position: number }): Observable<Card> {
    return this.http.put<Card>(`${this.base}/cards/${cardId}/move`, body);
  }

  reorderCards(listId: number, orderedCardIds: number[]): Observable<Card[]> {
    return this.http.put<Card[]>(`${this.base}/cards/list/${listId}/reorder`, { orderedCardIds });
  }

  assignCard(cardId: number, assigneeId: number | null): Observable<Card> {
    return this.http.put<Card>(`${this.base}/cards/${cardId}/assignee`, { assigneeId });
  }

  updatePriority(cardId: number, priority: CardPriority): Observable<Card> {
    return this.http.put<Card>(`${this.base}/cards/${cardId}/priority`, { priority });
  }

  updateStatus(cardId: number, status: CardStatus): Observable<Card> {
    return this.http.put<Card>(`${this.base}/cards/${cardId}/status`, { status });
  }

  archiveCard(cardId: number): Observable<Card> {
    return this.http.post<Card>(`${this.base}/cards/${cardId}/archive`, {});
  }

  unarchiveCard(cardId: number): Observable<Card> {
    return this.http.post<Card>(`${this.base}/cards/${cardId}/unarchive`, {});
  }

  getArchivedCards(boardId: number): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.base}/cards/board/${boardId}/archived`);
  }

  getOverdueCards(boardId: number): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.base}/cards/board/${boardId}/overdue`);
  }

  filterCards(boardId: number, filters: { priority?: CardPriority; status?: CardStatus }): Observable<Card[]> {
    let params = new HttpParams();
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<Card[]>(`${this.base}/cards/board/${boardId}/filter`, { params });
  }

  getCardsByAssignee(assigneeId: number): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.base}/cards/assignee/${assigneeId}`);
  }
}
