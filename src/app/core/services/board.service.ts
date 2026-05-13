import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Board, BoardMember, BoardRole } from '../models/board.model';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  createBoard(body: { workspaceId: number; name: string; description?: string; background?: string; visibility: string }): Observable<Board> {
    return this.http.post<Board>(`${this.base}/boards`, body);
  }

  getBoard(boardId: number): Observable<Board> {
    return this.http.get<Board>(`${this.base}/boards/${boardId}`);
  }

  getBoardsByWorkspace(workspaceId: number): Observable<Board[]> {
    return this.http.get<Board[]>(`${this.base}/boards/workspace/${workspaceId}`);
  }

  updateBoard(boardId: number, body: Partial<Board>): Observable<Board> {
    return this.http.put<Board>(`${this.base}/boards/${boardId}`, body);
  }

  closeBoard(boardId: number): Observable<Board> {
    return this.http.put<Board>(`${this.base}/boards/${boardId}/close`, {});
  }

  deleteBoard(boardId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/boards/${boardId}`);
  }

  addMember(boardId: number, body: { userId: number; role: BoardRole }): Observable<BoardMember> {
    const params = new HttpParams().set('userId', body.userId).set('role', body.role);
    return this.http.post<BoardMember>(`${this.base}/boards/${boardId}/members`, null, { params });
  }

  removeMember(boardId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/boards/${boardId}/members/${userId}`);
  }

  updateMemberRole(boardId: number, userId: number, role: BoardRole): Observable<BoardMember> {
    const params = new HttpParams().set('role', role);
    return this.http.put<BoardMember>(`${this.base}/boards/${boardId}/members/${userId}/role`, null, { params });
  }

  getMembers(boardId: number): Observable<BoardMember[]> {
    return this.http.get<BoardMember[]>(`${this.base}/boards/${boardId}/members`);
  }

  // Returns the union of explicit board members + workspace members of the
  // parent workspace. Use this to populate assignee pickers so invited users
  // appear even when they weren't explicitly added to the board.
  getAssignableUsers(boardId: number): Observable<BoardMember[]> {
    return this.http.get<BoardMember[]>(`${this.base}/boards/${boardId}/assignable-users`);
  }
}
