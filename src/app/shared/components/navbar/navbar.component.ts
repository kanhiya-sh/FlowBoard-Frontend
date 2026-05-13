import { Component, ElementRef, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, interval, of, startWith, switchMap, takeUntil } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { Workspace } from '../../../core/models/workspace.model';
import { Notification } from '../../../core/models/notification.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { AppTheme, ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  search = new FormControl('', { nonNullable: true });
  // Async-driven state in signals so the navbar stays in sync after every
  // HTTP / observable emission (notification poll, search, user-card load).
  // Click-toggled flags (showNotifications, showUserMenu) stay as plain
  // fields because click handlers already trigger CD via zone.js.
  readonly currentUser = signal<User | null>(null);
  readonly results = signal<User[]>([]);
  readonly selectedUser = signal<User | null>(null);
  readonly selectedUserWorkspaces = signal<Workspace[]>([]);
  readonly loadingWorkspaces = signal(false);
  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = signal(0);
  readonly theme = signal<AppTheme>('light');
  showNotifications = false;
  showUserMenu = false;
  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private notificationsApi: NotificationService,
    private workspacesApi: WorkspaceService,
    private themeService: ThemeService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
      this.showUserMenu = false;
      this.results.set([]);
      this.selectedUser.set(null);
    }
  }

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => this.currentUser.set(user));
    this.themeService.theme$.pipe(takeUntil(this.destroy$)).subscribe(theme => this.theme.set(theme));

    this.search.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(query => query.trim().length > 1 ? this.auth.searchUsers(query.trim()) : of([])),
      takeUntil(this.destroy$)
    ).subscribe(users => { this.results.set(users); this.selectedUser.set(null); });

    interval(30000).pipe(
      startWith(0),
      switchMap(() => this.notificationsApi.getUnreadCount()),
      takeUntil(this.destroy$)
    ).subscribe({ next: count => this.unreadCount.set(count), error: () => this.unreadCount.set(0) });
  }

  onUserSelect(user: User): void {
    this.selectedUser.set(user);
    this.selectedUserWorkspaces.set([]);
    this.loadingWorkspaces.set(true);
    this.results.set([]);
    this.search.setValue('', { emitEvent: false });
    this.workspacesApi.getPublicWorkspacesByUser(user.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: ws => { this.selectedUserWorkspaces.set(ws); this.loadingWorkspaces.set(false); },
      error: () => { this.selectedUserWorkspaces.set([]); this.loadingWorkspaces.set(false); }
    });
  }

  closeUserCard(): void {
    this.selectedUser.set(null);
    this.selectedUserWorkspaces.set([]);
  }

  openWorkspace(workspace: Workspace): void {
    this.selectedUser.set(null);
    this.selectedUserWorkspaces.set([]);
    this.router.navigate(['/public/workspace', workspace.workspaceId]);
  }

  openNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
    if (this.showNotifications) this.loadNotifications();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
    this.results.set([]);
    this.selectedUser.set(null);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  avatarInitial(user: User | null = this.currentUser()): string {
    const value = user?.fullName || user?.username || user?.email || 'U';
    return value.trim().charAt(0).toUpperCase() || 'U';
  }

  displayName(user: User | null = this.currentUser()): string {
    return user?.fullName || user?.username || 'FlowBoard user';
  }

  displayEmail(user: User | null = this.currentUser()): string {
    return user?.email || 'No email available';
  }

  loadNotifications(): void {
    this.notificationsApi.getNotifications().pipe(takeUntil(this.destroy$)).subscribe(items => {
      this.notifications.set([...items].sort((a, b) => Number(a.isRead) - Number(b.isRead)));
    });
  }

  markRead(item: Notification): void {
    this.notificationsApi.markRead(item.notificationId).subscribe(() => {
      this.notifications.update(items => items.map(n =>
        n.notificationId === item.notificationId ? { ...n, isRead: true } : n
      ));
      this.unreadCount.update(c => Math.max(0, c - 1));
    });
  }

  markAllRead(): void {
    this.notificationsApi.markAllRead().subscribe(() => {
      this.notifications.update(items => items.map(item => ({ ...item, isRead: true })));
      this.unreadCount.set(0);
    });
  }

  goProfile(): void {
    this.showUserMenu = false;
    this.router.navigateByUrl('/profile');
  }

  logout(): void {
    this.showUserMenu = false;
    this.showNotifications = false;
    this.auth.logout();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'ASSIGNMENT': return 'A';
      case 'MENTION': return '@';
      case 'DUE_DATE': return 'D';
      case 'COMMENT': return 'C';
      case 'MOVE': return 'M';
      case 'ATTACHMENT': return 'F';
      default: return 'N';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
