import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: false,
  templateUrl: './oauth-callback.component.html',
  styleUrl: './oauth-callback.component.scss'
})
export class OAuthCallbackComponent implements OnInit, OnDestroy {

  error = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Merge query params + fragment (handles both ?token=xxx and #token=xxx formats)
    const params = this.mergeAllParams();

    // ── Check for explicit error first ───────────────────────────────────────
    const error = params.get('oauthError') || params.get('error');
    if (error) {
      this.fail(decodeURIComponent(error));
      return;
    }

    // ── Extract token ─────────────────────────────────────────────────────────
    const token = params.get('token') || params.get('jwt') || params.get('access_token');
    if (!token) {
      this.fail('Google sign-in did not return a token. Please try again.');
      return;
    }

    // ── Extract user info from URL params (no extra API call needed!) ─────────
    // OAuth2SuccessHandler now sends all user fields in the redirect URL
    // This avoids the CORS issue of calling /auth/internal from auth-service origin
    const userId    = params.get('userId');
    const email     = params.get('email');
    const fullName  = params.get('fullName') || '';
    const username  = params.get('username') || '';
    const role      = params.get('role') || 'MEMBER';
    const avatarUrl = params.get('avatarUrl') || '';

    if (!userId || !email) {
      // Fallback: if old redirect format (token only), try completing via API
      this.authService.completeOAuthLogin(token)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.router.navigateByUrl('/dashboard', { replaceUrl: true }),
          error: () => this.fail('Google sign-in could not be completed. Please try again.')
        });
      return;
    }

    // ── Store session directly — no extra API call ────────────────────────────
    const user = {
      userId: Number(userId),
      email: decodeURIComponent(email),
      fullName: decodeURIComponent(fullName),
      username: decodeURIComponent(username),
      role: decodeURIComponent(role),
      avatarUrl: decodeURIComponent(avatarUrl),
      isActive: true
    };

    this.authService.setSession(token, user);
    this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private mergeAllParams(): URLSearchParams {
    const merged = new URLSearchParams();

    // Query params (standard: ?token=xxx&userId=yyy)
    this.route.snapshot.queryParamMap.keys.forEach(key => {
      const val = this.route.snapshot.queryParamMap.get(key);
      if (val !== null) merged.set(key, val);
    });

    // Fragment params (hash-based: #token=xxx)
    const fragment = this.route.snapshot.fragment;
    if (fragment) {
      const cleaned = fragment.startsWith('?') ? fragment.slice(1) : fragment;
      new URLSearchParams(cleaned).forEach((val, key) => merged.set(key, val));
    }

    return merged;
  }

  private fail(message: string): void {
    this.router.navigate(['/login'], {
      queryParams: { oauthError: message },
      replaceUrl: true
    });
  }
}
