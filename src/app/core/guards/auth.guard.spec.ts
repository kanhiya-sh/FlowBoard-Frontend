import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('allows navigation when user is authenticated', () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/dashboard' } as RouterStateSnapshot
    );
    expect(result).toBeTrue();
  });

  it('redirects to /login with redirect query param when not authenticated', () => {
    authServiceMock.isAuthenticated.and.returnValue(false);
    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/boards/5' } as RouterStateSnapshot
    );
    expect(result instanceof UrlTree).toBeTrue();
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/login');
    expect(tree.toString()).toContain('redirect');
  });
});
