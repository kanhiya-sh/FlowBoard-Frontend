import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  userId: number;
  email: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  fullName?: string;
  username?: string;
  role?: string;
  avatarUrl?: string;
  isActive?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly base = environment.apiBase;
  private readonly googleOAuthUrl = environment.googleOAuthUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // ─── Auth ──────────────────────────────────────────────────────────────────

  login(body: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, body)
      .pipe(tap(res => this.setSessionFromResponse(res)));
  }

  register(body: { fullName: string; email: string; username: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/auth/register`, body);
  }

  loginWithGoogle(): void {
    // OAuth2 MUST go directly to auth-service (8081) — browser redirect, not AJAX
    // Gateway (WebFlux/reactive) cannot preserve the stateful OAuth2 HttpSession
    window.location.href = this.googleOAuthUrl;
  }

  /**
   * Called from OAuthCallbackComponent as FALLBACK only when URL params
   * don't include userId/email (old redirect format).
   * Normal flow: OAuthCallbackComponent reads all user data from URL params
   * and calls setSession() directly — no HTTP call needed.
   */
  completeOAuthLogin(token: string): Observable<User> {
    const claims = this.decodeJwt(token);
    if (!claims) return throwError(() => new Error('Invalid token'));

    const email = this.readClaim(claims, ['email', 'sub']);
    if (!email) return throwError(() => new Error('Token has no email claim'));

    // Store token first so interceptor can attach it
    localStorage.setItem('flowboard_token', token);

    // Call through GATEWAY (8080) — not direct to auth-service (8081)
    return this.http.get<User>(`${this.base}/auth/internal/users/email/${encodeURIComponent(email)}`)
      .pipe(tap(user => {
        localStorage.setItem('flowboard_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }));
  }

  // ─── Session management ────────────────────────────────────────────────────

  /**
   * Called directly from OAuthCallbackComponent after successful OAuth redirect.
   * Public so the callback component can set the session without an extra API call.
   */
  setSession(token: string, user: User): void {
    localStorage.setItem('flowboard_token', token);
    localStorage.setItem('flowboard_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private setSessionFromResponse(res: AuthResponse): void {
    const user: User = {
      userId: res.userId,
      email: res.email,
      fullName: res.fullName || res.email,
      username: res.username || '',
      role: res.role || 'MEMBER',
      avatarUrl: res.avatarUrl,
      isActive: res.isActive !== undefined ? res.isActive : true
    };
    localStorage.setItem('flowboard_token', res.token);
    localStorage.setItem('flowboard_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem('flowboard_token');
    localStorage.removeItem('flowboard_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // ─── User operations ───────────────────────────────────────────────────────

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const claims = this.decodeJwt(token);
    if (!claims) return false;
    return !this.isExpired(claims);
  }

  getToken(): string | null {
    return localStorage.getItem('flowboard_token');
  }

  updateProfile(userId: number, body: { fullName: string; username: string; avatarUrl?: string | null }): Observable<User> {
    return this.http.put<User>(`${this.base}/auth/profile/${userId}`, body)
      .pipe(tap(user => {
        localStorage.setItem('flowboard_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }));
  }

  changePassword(userId: number, body: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.put<void>(`${this.base}/auth/password/${userId}`, body);
  }

  searchUsers(query: string): Observable<User[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<User[]>(`${this.base}/auth/search`, { params });
  }

  getUserByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.base}/auth/internal/users/email/${encodeURIComponent(email)}`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem('flowboard_user');
      return raw ? JSON.parse(raw) as User : null;
    } catch {
      localStorage.removeItem('flowboard_user');
      return null;
    }
  }

  private decodeJwt(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
      const json = decodeURIComponent(
        atob(padded).split('').map(c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private isExpired(claims: Record<string, unknown>): boolean {
    const exp = claims['exp'];
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  }

  private readClaim(claims: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const val = claims[key];
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
    return null;
  }
}
