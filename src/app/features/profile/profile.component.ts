import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  // currentUser$ pushes via BehaviorSubject — wrap as a signal so the template
  // re-renders the moment the user resolves, without depending on zone CD timing.
  readonly user = signal<User | null>(null);
  profileForm = this.fb.group({
    fullName: ['', Validators.required],
    username: ['', Validators.required],
    avatarUrl: ['']
  });
  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private auth: AuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.user.set(user);
      if (user) {
        this.profileForm.patchValue({
          fullName: user.fullName,
          username: user.username,
          avatarUrl: user.avatarUrl || ''
        });
      }
    });
  }

  saveProfile(): void {
    const user = this.user();
    if (!user || this.profileForm.invalid) return;
    const value = this.profileForm.getRawValue();
    this.auth.updateProfile(user.userId, {
      fullName: value.fullName || '',
      username: value.username || '',
      avatarUrl: value.avatarUrl || null
    }).subscribe({
      next: () => this.toast.success('Profile updated.'),
      error: () => this.toast.error('Could not update profile.')
    });
  }

  changePassword(): void {
    const user = this.user();
    if (!user || this.passwordForm.invalid) return;
    const value = this.passwordForm.getRawValue();
    this.auth.changePassword(user.userId, {
      currentPassword: value.currentPassword || '',
      newPassword: value.newPassword || ''
    }).subscribe({
      next: () => { this.passwordForm.reset(); this.toast.success('Password changed.'); },
      error: () => this.toast.error('Could not change password.')
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
