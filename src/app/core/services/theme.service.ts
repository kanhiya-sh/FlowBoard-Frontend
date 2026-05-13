import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'flowboard_theme';
  private themeSubject = new BehaviorSubject<AppTheme>(this.getInitialTheme());
  theme$ = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  toggle(): void {
    this.setTheme(this.themeSubject.value === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    localStorage.setItem(this.storageKey, theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  get currentTheme(): AppTheme {
    return this.themeSubject.value;
  }

  private getInitialTheme(): AppTheme {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: AppTheme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
