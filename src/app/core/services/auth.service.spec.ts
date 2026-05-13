import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isAuthenticated() returns false when no token', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('isAuthenticated() returns true when token exists', () => {
    localStorage.setItem('flowboard_token', 'test-token');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('getToken() returns the stored token', () => {
    localStorage.setItem('flowboard_token', 'abc-123');
    expect(service.getToken()).toBe('abc-123');
  });

  it('login() stores token + user and emits currentUser', (done) => {
    const mockRes: AuthResponse = {
      token: 'jwt-token',
      userId: 1,
      email: 'a@b.com',
      fullName: 'Alice',
      username: 'alice',
      role: 'MEMBER',
      avatarUrl: null,
      isActive: true,
      message: 'Login successful'
    } as AuthResponse;

    service.currentUser$.subscribe(user => {
      if (user && user.userId === 1) {
        expect(user.email).toBe('a@b.com');
        expect(localStorage.getItem('flowboard_token')).toBe('jwt-token');
        done();
      }
    });

    service.login({ email: 'a@b.com', password: 'secret' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiBase}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockRes);
  });

  it('logout() clears storage and navigates to /login', () => {
    localStorage.setItem('flowboard_token', 't');
    localStorage.setItem('flowboard_user', '{}');
    const navSpy = spyOn(router, 'navigate');
    service.logout();
    expect(localStorage.getItem('flowboard_token')).toBeNull();
    expect(localStorage.getItem('flowboard_user')).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });
});
