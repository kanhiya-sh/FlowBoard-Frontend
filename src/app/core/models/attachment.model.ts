export interface Attachment {
  attachmentId: number;
  cardId: number;
  uploaderId?: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  sizeKb: number;
  uploadedAt?: string;
}
