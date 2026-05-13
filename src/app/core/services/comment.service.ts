import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  createComment(body: { cardId: number; content: string; parentCommentId?: number | null }): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/comments`, body);
  }

  getCommentsByCard(cardId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.base}/comments/card/${cardId}`);
  }

  getReplies(commentId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.base}/comments/${commentId}/replies`);
  }

  updateComment(commentId: number, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.base}/comments/${commentId}`, { content });
  }

  // Backend returns text/plain ("Comment deleted successfully") — use responseType:'text'
  // so the observable resolves cleanly. With the default json parser Angular
  // tries to JSON.parse the body, fails, and logs an HttpErrorResponse even
  // though the HTTP status was 200.
  deleteComment(commentId: number): Observable<string> {
    return this.http.delete(`${this.base}/comments/${commentId}`, { responseType: 'text' });
  }
}
