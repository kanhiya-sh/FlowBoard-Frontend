import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Label } from '../models/label.model';

@Injectable({ providedIn: 'root' })
export class LabelService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  createLabel(body: { boardId: number; name: string; color: string }): Observable<Label> {
    return this.http.post<Label>(`${this.base}/labels`, body);
  }

  getLabelsByBoard(boardId: number): Observable<Label[]> {
    return this.http.get<Label[]>(`${this.base}/labels/board/${boardId}`);
  }

  updateLabel(labelId: number, body: Partial<Label>): Observable<Label> {
    return this.http.put<Label>(`${this.base}/labels/${labelId}`, body);
  }

  deleteLabel(labelId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/labels/${labelId}`);
  }

  // Backend returns text/plain ("Label added to card successfully") — use responseType:'text'
  // so the success callback fires; otherwise Angular tries JSON.parse and silently errors.
  addLabelToCard(labelId: number, cardId: number): Observable<string> {
    return this.http.post(`${this.base}/labels/${labelId}/card/${cardId}`, {}, { responseType: 'text' });
  }

  // Backend returns text/plain ("Label removed from card successfully") — same fix.
  removeLabelFromCard(labelId: number, cardId: number): Observable<string> {
    return this.http.delete(`${this.base}/labels/${labelId}/card/${cardId}`, { responseType: 'text' });
  }

  getLabelsByCard(cardId: number): Observable<Label[]> {
    return this.http.get<Label[]>(`${this.base}/labels/card/${cardId}`);
  }
}
