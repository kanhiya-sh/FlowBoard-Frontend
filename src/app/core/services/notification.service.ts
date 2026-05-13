import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/notifications`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.base}/notifications/unread/count`);
  }

  markRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/notifications/${id}/read`, {});
  }

  // Backend returns text/plain ("All notifications marked as read") — use responseType:'text' to avoid JSON parse error.
  markAllRead(): Observable<string> {
    return this.http.put(`${this.base}/notifications/read-all`, {}, { responseType: 'text' });
  }

  // Backend returns text/plain ("Notification deleted successfully") — same fix.
  deleteNotification(id: number): Observable<string> {
    return this.http.delete(`${this.base}/notifications/${id}`, { responseType: 'text' });
  }
}
