import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Attachment } from '../models/attachment.model';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  addAttachment(body: { cardId: number; fileName: string; fileUrl: string; fileType: string; sizeKb: number }): Observable<Attachment> {
    return this.http.post<Attachment>(`${this.base}/attachments`, body);
  }

  getAttachmentsByCard(cardId: number): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.base}/attachments/card/${cardId}`);
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/attachments/${attachmentId}`);
  }
}
