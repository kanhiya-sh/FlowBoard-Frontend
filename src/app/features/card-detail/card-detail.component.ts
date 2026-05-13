import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, switchMap, takeUntil } from 'rxjs';
import { Attachment } from '../../core/models/attachment.model';
import { BoardMember } from '../../core/models/board.model';
import { Card, CardPriority, CardStatus } from '../../core/models/card.model';
import { Checklist } from '../../core/models/checklist.model';
import { Comment } from '../../core/models/comment.model';
import { Label } from '../../core/models/label.model';
import { TaskList } from '../../core/models/list.model';
import { AttachmentService } from '../../core/services/attachment.service';
import { BoardService } from '../../core/services/board.service';
import { CardService } from '../../core/services/card.service';
import { ChecklistService } from '../../core/services/checklist.service';
import { CommentService } from '../../core/services/comment.service';
import { LabelService } from '../../core/services/label.service';
import { ListService } from '../../core/services/list.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-card-detail',
  standalone: false,
  templateUrl: './card-detail.component.html',
  styleUrl: './card-detail.component.scss'
})
export class CardDetailComponent implements OnInit, OnDestroy {
  // Async-mutated state held in signals so HTTP responses always trigger CD.
  // Forms, constants and click-toggled flags stay as plain fields.
  readonly card = signal<Card | undefined>(undefined);
  readonly lists = signal<TaskList[]>([]);
  readonly members = signal<BoardMember[]>([]);
  readonly labels = signal<Label[]>([]);
  readonly cardLabels = signal<Label[]>([]);
  readonly checklists = signal<Checklist[]>([]);
  readonly attachments = signal<Attachment[]>([]);
  readonly comments = signal<Comment[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  priorities: CardPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  statuses: CardStatus[] = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    dueDate: [''],
    startDate: [''],
    coverColor: ['#ffffff'],
    assigneeId: [null as number | null]
  });
  commentForm = this.fb.group({ content: ['', Validators.required] });
  checklistForm = this.fb.group({ title: ['', Validators.required] });
  attachmentForm = this.fb.group({
    fileName: ['', Validators.required],
    fileUrl: ['', Validators.required],
    fileType: ['', Validators.required],
    sizeKb: [0, Validators.required]
  });
  private boardId = 0;
  private cardId = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cardsApi: CardService,
    private boardsApi: BoardService,
    private listsApi: ListService,
    private labelsApi: LabelService,
    private checklistApi: ChecklistService,
    private attachmentsApi: AttachmentService,
    private commentsApi: CommentService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.boardId = Number(params.get('boardId'));
        this.cardId = Number(params.get('cardId'));
        return forkJoin({
          card: this.cardsApi.getCard(this.cardId),
          lists: this.listsApi.getListsByBoard(this.boardId),
          // Assignee dropdown needs every user who can access the board —
          // explicit board members PLUS invited workspace members. The
          // /assignable-users endpoint returns the union, enriched with email.
          members: this.boardsApi.getAssignableUsers(this.boardId),
          labels: this.labelsApi.getLabelsByBoard(this.boardId),
          cardLabels: this.labelsApi.getLabelsByCard(this.cardId),
          checklists: this.checklistApi.getChecklistsByCard(this.cardId),
          attachments: this.attachmentsApi.getAttachmentsByCard(this.cardId),
          comments: this.commentsApi.getCommentsByCard(this.cardId)
        });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: data => {
        this.card.set(data.card);
        this.lists.set(data.lists);
        this.members.set(data.members);
        this.labels.set(data.labels);
        this.cardLabels.set(data.cardLabels);
        this.checklists.set(data.checklists);
        this.attachments.set(data.attachments);
        this.comments.set([...data.comments].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        this.form.patchValue({
          title: data.card.title,
          description: data.card.description || '',
          dueDate: this.dateValue(data.card.dueDate),
          startDate: this.dateValue(data.card.startDate),
          coverColor: data.card.coverColor || '#ffffff',
          assigneeId: data.card.assigneeId || null
        });
        this.loading.set(false);
      },
      error: () => { this.toast.error('Could not load card.'); this.loading.set(false); }
    });
  }

  saveDetails(): void {
    const card = this.card();
    if (!card || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    this.cardsApi.updateCard(card.cardId, {
      listId: card.listId,
      boardId: card.boardId,
      title: value.title || '',
      description: value.description || '',
      priority: card.priority,
      status: card.status,
      dueDate: value.dueDate || null,
      startDate: value.startDate || null,
      clearDueDate: !value.dueDate,
      clearStartDate: !value.startDate,
      coverColor: value.coverColor || '#ffffff',
      assigneeId: value.assigneeId || null
    } as any).subscribe({
      next: updated => { this.card.set(updated); this.toast.success('Card updated.'); this.saving.set(false); },
      error: () => { this.toast.error('Could not update card.'); this.saving.set(false); }
    });
  }

  setPriority(priority: CardPriority): void {
    const card = this.card();
    if (!card || card.priority === priority) return;
    this.cardsApi.updatePriority(card.cardId, priority).subscribe({
      next: updated => { this.card.set(updated); this.toast.success('Priority updated.'); },
      error: () => this.toast.error('Could not update priority.')
    });
  }

  setStatus(status: CardStatus): void {
    const card = this.card();
    if (!card || card.status === status) return;
    this.cardsApi.updateStatus(card.cardId, status).subscribe({
      next: updated => { this.card.set(updated); this.toast.success('Status updated.'); },
      error: () => this.toast.error('Could not update status.')
    });
  }

  assign(): void {
    const card = this.card();
    if (!card) return;
    this.cardsApi.assignCard(card.cardId, this.form.controls.assigneeId.value).subscribe(updated => {
      this.card.set(updated);
      this.toast.success('Assignee updated.');
    });
  }

  getAssignee(): BoardMember | null {
    const card = this.card();
    if (!card?.assigneeId) return null;
    return this.members().find(m => m.userId === card.assigneeId) || null;
  }

  moveToList(targetListId: number): void {
    const card = this.card();
    if (!card || card.listId === targetListId) return;
    this.cardsApi.moveCard(card.cardId, { targetListId, position: 0 }).subscribe(updated => {
      this.card.set(updated);
      this.toast.success('Card moved.');
    });
  }

  toggleLabel(label: Label): void {
    const card = this.card();
    if (!card) return;
    const attached = this.hasLabel(label);
    const previous = this.cardLabels();

    // Optimistic UI — reflect change instantly so the chip flips on click.
    this.cardLabels.set(attached
      ? previous.filter(item => item.labelId !== label.labelId)
      : [...previous, label]);

    const request = attached
      ? this.labelsApi.removeLabelFromCard(label.labelId, card.cardId)
      : this.labelsApi.addLabelToCard(label.labelId, card.cardId);

    request.subscribe({
      next: () => this.toast.success(attached ? 'Label removed.' : 'Label added.'),
      error: () => {
        // Rollback on backend failure so UI never shows fake success.
        this.cardLabels.set(previous);
        this.toast.error(attached ? 'Could not remove label.' : 'Could not add label.');
      }
    });
  }

  // Email-first display for comment authors. Priority:
  //   1. authorEmail straight from the enriched CommentResponseDTO
  //   2. email of a board member with the same userId (membership look-up)
  //   3. authorName (full name) if the backend provided one
  //   4. "User #id" as the last-resort fallback
  authorDisplay(authorId: number, authorName?: string, authorEmail?: string): string {
    if (authorEmail && authorEmail.trim()) return authorEmail;
    const member = this.members().find(m => m.userId === authorId);
    if (member?.email) return member.email;
    if (authorName && authorName.trim()) return authorName;
    return `User #${authorId}`;
  }

  authorInitial(authorId: number, authorName?: string, authorEmail?: string): string {
    const display = this.authorDisplay(authorId, authorName, authorEmail);
    return display.charAt(0).toUpperCase() || 'U';
  }

  addChecklist(): void {
    const card = this.card();
    if (!card || this.checklistForm.invalid) return;
    this.checklistApi.createChecklist({ cardId: card.cardId, title: this.checklistForm.controls.title.value || '' }).subscribe(item => {
      this.checklists.update(items => [...items, { ...item, items: item.items || [] }]);
      this.checklistForm.reset();
    });
  }

  addItemToChecklist(checklist: Checklist): void {
    const text = (checklist._newItem || '').trim();
    if (!text) return;
    this.checklistApi.addItem({ checklistId: checklist.checklistId, text }).subscribe(item => {
      // Mutate the nested checklist's items in place so the existing object
      // reference stays stable for any consumer; then re-emit the parent
      // signal so the signal-bound view picks up the change.
      checklist.items = [...(checklist.items || []), item];
      checklist._newItem = '';
      this.checklists.update(items => [...items]);
    });
  }

  toggleItem(itemId: number, checklist: Checklist): void {
    this.checklistApi.toggleItem(itemId).subscribe(item => {
      checklist.items = checklist.items.map(current => current.itemId === item.itemId ? item : current);
      this.checklists.update(items => [...items]);
    });
  }

  deleteChecklist(checklist: Checklist): void {
    this.checklistApi.deleteChecklist(checklist.checklistId).subscribe(() => {
      this.checklists.update(items => items.filter(item => item.checklistId !== checklist.checklistId));
    });
  }

  addAttachment(): void {
    const card = this.card();
    if (!card || this.attachmentForm.invalid) return;
    const value = this.attachmentForm.getRawValue();
    this.attachmentsApi.addAttachment({
      cardId: card.cardId,
      fileName: value.fileName || '',
      fileUrl: value.fileUrl || '',
      fileType: value.fileType || '',
      sizeKb: Number(value.sizeKb)
    }).subscribe(item => {
      this.attachments.update(items => [...items, item]);
      this.attachmentForm.reset({ sizeKb: 0 });
    });
  }

  deleteAttachment(id: number): void {
    this.attachmentsApi.deleteAttachment(id).subscribe(() =>
      this.attachments.update(items => items.filter(item => item.attachmentId !== id))
    );
  }

  addComment(): void {
    const card = this.card();
    if (!card || this.commentForm.invalid) return;
    this.commentsApi.createComment({ cardId: card.cardId, content: this.commentForm.controls.content.value || '' }).subscribe(comment => {
      this.comments.update(items => [comment, ...items]);
      this.commentForm.reset();
    });
  }

  reply(comment: Comment, content: string): void {
    const card = this.card();
    if (!card || !content.trim()) return;
    this.commentsApi.createComment({ cardId: card.cardId, content, parentCommentId: comment.commentId }).subscribe(reply => {
      comment.replies = [...(comment.replies || []), reply];
      comment.replying = false;
      // Re-emit the comments signal so the new reply renders without an extra click.
      this.comments.update(items => [...items]);
    });
  }

  updateComment(comment: Comment, content: string): void {
    this.commentsApi.updateComment(comment.commentId, content).subscribe(updated => {
      comment.content = updated.content;
      comment.editing = false;
      this.comments.update(items => [...items]);
    });
  }

  deleteComment(comment: Comment): void {
    this.commentsApi.deleteComment(comment.commentId).subscribe(() =>
      this.comments.update(items => items.filter(item => item.commentId !== comment.commentId))
    );
  }

  archive(): void {
    const card = this.card();
    if (!card) return;
    this.cardsApi.archiveCard(card.cardId).subscribe(updated => this.card.set(updated));
  }

  remove(): void {
    const card = this.card();
    if (!card || !confirm('Delete this card?')) return;
    this.cardsApi.deleteCard(card.cardId).subscribe(() => this.close());
  }

  close(): void {
    this.router.navigate(['/board', this.boardId]);
  }

  hasLabel(label: Label): boolean {
    return this.cardLabels().some(item => item.labelId === label.labelId);
  }

  progress(checklist: Checklist): number {
    const total = checklist.items?.length || 0;
    if (!total) return 0;
    return Math.round((checklist.items.filter(item => item.isCompleted).length / total) * 100);
  }

  private dateValue(value?: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
