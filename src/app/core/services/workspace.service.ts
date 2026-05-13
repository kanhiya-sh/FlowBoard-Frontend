import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Workspace, WorkspaceMember, WorkspaceRole, WorkspaceVisibility } from '../models/workspace.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private base = environment.apiBase;
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();
  constructor(private http: HttpClient) {}

  triggerRefresh(): void { this.refreshSubject.next(); }

  createWorkspace(body: { name: string; description?: string; visibility: WorkspaceVisibility }): Observable<Workspace> {
    return this.http.post<Workspace>(`${this.base}/workspaces`, body);
  }

  getMyWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${this.base}/workspaces/my`);
  }

  getWorkspace(id: number): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.base}/workspaces/${id}`);
  }

  updateWorkspace(id: number, body: Partial<Workspace>): Observable<Workspace> {
    return this.http.put<Workspace>(`${this.base}/workspaces/${id}`, body);
  }

  // Backend returns text/plain ("Workspace deleted successfully"), so we MUST use
  // responseType: 'text' — otherwise Angular tries to JSON.parse it and the
  // observable falls into the error callback even though the delete succeeded.
  deleteWorkspace(id: number): Observable<string> {
    return this.http.delete(`${this.base}/workspaces/${id}`, { responseType: 'text' });
  }

  addMember(id: number, body: { userId: number; role: WorkspaceRole }): Observable<WorkspaceMember> {
    const params = new HttpParams().set('userId', body.userId).set('role', body.role);
    return this.http.post<WorkspaceMember>(`${this.base}/workspaces/${id}/members`, null, { params });
  }

  // Backend returns text/plain ("Member removed successfully") — same parse-trap as deleteWorkspace.
  removeMember(id: number, userId: number): Observable<string> {
    return this.http.delete(`${this.base}/workspaces/${id}/members/${userId}`, { responseType: 'text' });
  }

  updateMemberRole(id: number, userId: number, role: WorkspaceRole): Observable<WorkspaceMember> {
    const params = new HttpParams().set('role', role);
    return this.http.put<WorkspaceMember>(`${this.base}/workspaces/${id}/members/${userId}/role`, null, { params });
  }

  getMembers(id: number): Observable<WorkspaceMember[]> {
    return this.http.get<WorkspaceMember[]>(`${this.base}/workspaces/${id}/members`);
  }

  getPublicWorkspacesByUser(userId: number): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${this.base}/workspaces/user/${userId}/public`);
  }
}
