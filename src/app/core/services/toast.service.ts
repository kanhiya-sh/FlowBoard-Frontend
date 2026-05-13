import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messagesSubject = new BehaviorSubject<ToastMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();
  private nextId = 1;

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.messagesSubject.next(this.messagesSubject.value.filter(item => item.id !== id));
  }

  private push(type: ToastMessage['type'], message: string): void {
    const toast = { id: this.nextId++, type, message };
    this.messagesSubject.next([...this.messagesSubject.value, toast]);
    window.setTimeout(() => this.dismiss(toast.id), 4200);
  }
}
