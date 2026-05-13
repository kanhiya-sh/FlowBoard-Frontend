import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true]
  });
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const oauthError = this.route.snapshot.queryParamMap.get('oauthError');
    if (oauthError) this.error = oauthError;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading = true;
    this.error = '';
    this.auth.login({ email: email || '', password: password || '' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('redirect') || '/dashboard'),
      error: () => {
        this.error = 'Invalid email or password.';
        this.loading = false;
      }
    });
  }

  continueWithGoogle(): void {
    this.error = '';
    this.auth.loginWithGoogle();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
