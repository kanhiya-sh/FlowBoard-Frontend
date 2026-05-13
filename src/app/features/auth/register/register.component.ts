import { Component, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmPassword')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnDestroy {
  loading = false;
  error = '';
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordsMatch });
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  continueWithGoogle(): void {
    this.error = '';
    this.auth.loginWithGoogle();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.loading = true;
    this.error = '';
    this.auth.register({
      fullName: value.fullName || '',
      email: value.email || '',
      username: value.username || '',
      password: value.password || ''
    }).pipe(
      switchMap(() => this.auth.login({ email: value.email || '', password: value.password || '' })),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error = 'Could not create account. Please check your details.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
