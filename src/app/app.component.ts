import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, distinctUntilChanged, filter, map, startWith } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ToastMessage, ToastService } from './core/services/toast.service';
import { User } from './core/models/user.model';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  currentUser$: Observable<User | null> = this.auth.currentUser$;
  toasts$: Observable<ToastMessage[]> = this.toast.messages$;

  // Auth-page detection driven by NavigationEnd, NOT by a method call in the
  // template. Every Angular change-detection cycle (toggle dark-mode, focus
  // search, click anywhere) used to re-invoke isAuthPage() and re-read
  // router.url. While a navigation is mid-flight router.url can briefly hold
  // the *next* URL — flipping the boolean back and forth and tearing the
  // navbar / sidebar / router-outlet subtree down and up. That manifested as
  // the "flicker / extra-click to stabilize" bug.
  //
  // By computing the value once per real navigation (NavigationEnd) and piping
  // it through distinctUntilChanged, the *ngIf only re-evaluates when the
  // auth-vs-shell decision genuinely changes. startWith(router.url) gives a
  // synchronous initial value so the shell paints correctly on first load
  // (matches the user's preferred init style over startWith(null)).
  isAuthPage$: Observable<boolean> = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map(e => e.urlAfterRedirects || e.url),
    startWith(this.router.url),
    map(url => AppComponent.matchAuthPath(url)),
    distinctUntilChanged()
  );

  constructor(public router: Router, private auth: AuthService, public toast: ToastService, private theme: ThemeService) {}

  ngOnInit(): void {
    this.forwardOAuthRedirect();
  }

  // Pure URL → boolean mapper. Static so the template can never accidentally
  // re-bind to it as a function call (which would re-introduce the original
  // change-detection thrash).
  private static matchAuthPath(url: string): boolean {
    return url.startsWith('/login')
        || url.startsWith('/register')
        || url.startsWith('/oauth/')
        || url.startsWith('/oauth2/');
  }

  private forwardOAuthRedirect(): void {
    const params = this.readOAuthParamsFromLocation();
    const hasOAuthResult = params.has('token') || params.has('jwt') || params.has('access_token') || params.has('error');
    const path = window.location.pathname;
    if (!hasOAuthResult || path.startsWith('/oauth') || path.startsWith('/login/oauth2')) return;

    this.router.navigate(['/oauth/callback'], {
      queryParams: this.toQueryParams(params),
      replaceUrl: true
    });
  }

  private readOAuthParamsFromLocation(): URLSearchParams {
    const params = new URLSearchParams(window.location.search);
    const fragment = window.location.hash.replace(/^#\/?/, '');
    const queryStart = fragment.indexOf('?');
    const fragmentParams = new URLSearchParams(queryStart >= 0 ? fragment.slice(queryStart + 1) : fragment);
    fragmentParams.forEach((value, key) => params.set(key, value));
    return params;
  }

  private toQueryParams(params: URLSearchParams): Record<string, string> {
    const queryParams: Record<string, string> = {};
    params.forEach((value, key) => {
      queryParams[key] = value;
    });
    return queryParams;
  }
}
