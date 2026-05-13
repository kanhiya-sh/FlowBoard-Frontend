import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Notification } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-notifications',
  standalone: false,
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  // Async state in signals so HTTP responses always trigger CD reliably.
  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(true);
  // computed signal — auto-recomputes whenever `notifications` changes.
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  private destroy$ = new Subject<void>();

  constructor(private notifApi: NotificationService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.notifApi.getNotifications().pipe(takeUntil(this.destroy$)).subscribe({
      next: items => {
        this.notifications.set([...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        this.loading.set(false);
      },
      error: () => { this.toast.error('Could not load notifications.'); this.loading.set(false); }
    });
  }

  markRead(n: Notification): void {
    if (n.isRead) return;
    this.notifApi.markRead(n.notificationId).subscribe(() => {
      this.notifications.update(items => items.map(x =>
        x.notificationId === n.notificationId ? { ...x, isRead: true } : x
      ));
    });
  }

  markAllRead(): void {
    this.notifApi.markAllRead().subscribe(() => {
      this.notifications.update(items => items.map(n => ({ ...n, isRead: true })));
      this.toast.success('All marked as read.');
    });
  }

  deleteNotif(n: Notification): void {
    // Optimistic remove so the card disappears instantly + protects against double-click 404.
    const previous = this.notifications();
    this.notifications.set(previous.filter(x => x.notificationId !== n.notificationId));

    this.notifApi.deleteNotification(n.notificationId).subscribe({
      next: () => { /* already removed optimistically */ },
      error: (err) => {
        // 404 = notification already deleted server-side; keep UI clean.
        if (err?.status === 404) return;
        // Real error: roll back and surface it.
        this.notifications.set(previous);
        this.toast.error('Could not delete notification.');
      }
    });
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'ASSIGNMENT': return '👤';
      case 'COMMENT': return '💬';
      case 'MENTION': return '@';
      case 'DUE_DATE': return '📅';
      case 'MOVE': return '➡️';
      case 'ATTACHMENT': return '📎';
      default: return '🔔';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
