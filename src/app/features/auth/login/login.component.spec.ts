import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceMock = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'loginWithGoogle']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RouterTestingModule],
      declarations: [LoginComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid when empty', () => {
    expect(component.form.valid).toBeFalse();
  });

  it('form is valid with proper email + password', () => {
    component.form.setValue({ email: 'a@b.com', password: 'secret1', remember: true });
    expect(component.form.valid).toBeTrue();
  });

  it('submit() does not call auth.login when form is invalid', () => {
    component.form.setValue({ email: '', password: '', remember: true });
    component.submit();
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('submit() calls auth.login with credentials when form is valid', () => {
    authServiceMock.login.and.returnValue(of({} as any));
    component.form.setValue({ email: 'a@b.com', password: 'secret1', remember: true });
    component.submit();
    expect(authServiceMock.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret1' });
  });

  it('submit() sets an error message on login failure', () => {
    authServiceMock.login.and.returnValue(throwError(() => new Error('bad')));
    component.form.setValue({ email: 'a@b.com', password: 'secret1', remember: true });
    component.submit();
    expect(component.error).toBe('Invalid email or password.');
    expect(component.loading).toBeFalse();
  });

  it('continueWithGoogle() delegates to auth.loginWithGoogle', () => {
    component.continueWithGoogle();
    expect(authServiceMock.loginWithGoogle).toHaveBeenCalled();
  });
});
