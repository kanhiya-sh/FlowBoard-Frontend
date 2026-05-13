import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { Workspace } from '../../core/models/workspace.model';
import { Board } from '../../core/models/board.model';
import { TaskList } from '../../core/models/list.model';
import { Card } from '../../core/models/card.model';
import { Comment } from '../../core/models/comment.model';
import { WorkspaceService } from '../../core/services/workspace.service';
import { BoardService } from '../../core/services/board.service';
import { ListService } from '../../core/services/list.service';
import { CardService } from '../../core/services/card.service';
import { CommentService } from '../../core/services/comment.service';
import { ToastService } from '../../core/services/toast.service';

interface BoardWithLists extends Board {
  lists: (TaskList & { cards: Card[] })[];
}

@Component({
  selector: 'app-public-workspace',
  standalone: false,
  templateUrl: './public-workspace.component.html',
  styleUrl: './public-workspace.component.scss'
})
export class PublicWorkspaceComponent implements OnInit, OnDestroy {
  // Async-driven state in signals; the comment form stays as a plain
  // ReactiveForm — that keeps Angular's form integration untouched.
  readonly workspace = signal<Workspace | undefined>(undefined);
  readonly boards = signal<BoardWithLists[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly selectedCard = signal<Card | undefined>(undefined);
  readonly cardComments = signal<Comment[]>([]);
  readonly loadingComments = signal(false);
  readonly postingComment = signal(false);
  commentForm = this.fb.group({ content: ['', Validators.required] });
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private workspacesApi: WorkspaceService,
    private boardsApi: BoardService,
    private listsApi: ListService,
    private cardsApi: CardService,
    private commentsApi: CommentService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        this.loading.set(true);
        this.notFound.set(false);
        return this.workspacesApi.getWorkspace(id);
      }),
      switchMap(workspace => {
        if (workspace.visibility !== 'PUBLIC') {
          this.notFound.set(true);
          this.loading.set(false);
          return of({ workspace, boards: [] as Board[] });
        }
        this.workspace.set(workspace);
        return this.boardsApi.getBoardsByWorkspace(workspace.workspaceId).pipe(
          switchMap(boards => of({ workspace, boards }))
        );
      }),
      switchMap(data => {
        if (!data.boards.length) {
          this.boards.set([]);
          this.loading.set(false);
          return of(null);
        }
        return forkJoin(
          data.boards.map(board => this.listsApi.getListsByBoard(board.boardId).pipe(
            switchMap(lists => {
              if (!lists.length) return of({ ...board, lists: [] } as BoardWithLists);
              return forkJoin(lists.map(list => this.cardsApi.getCardsByList(list.listId).pipe(
                switchMap(cards => of({ ...list, cards }))
              ))).pipe(switchMap(listsWithCards => of({ ...board, lists: listsWithCards } as BoardWithLists)));
            })
          ))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: result => {
        if (Array.isArray(result)) {
          this.boards.set(result as BoardWithLists[]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      }
    });
  }

  openCard(card: Card): void {
    this.selectedCard.set(card);
    this.cardComments.set([]);
    this.loadingComments.set(true);
    this.commentsApi.getCommentsByCard(card.cardId).pipe(takeUntil(this.destroy$)).subscribe({
      next: comments => { this.cardComments.set(comments); this.loadingComments.set(false); },
      error: () => { this.loadingComments.set(false); }
    });
  }

  closeCard(): void {
    this.selectedCard.set(undefined);
    this.cardComments.set([]);
    this.commentForm.reset();
  }

  postComment(): void {
    const card = this.selectedCard();
    if (!card || this.commentForm.invalid || this.postingComment()) return;
    const content = String(this.commentForm.value.content || '').trim();
    if (!content) return;
    this.postingComment.set(true);
    this.commentsApi.createComment({ cardId: card.cardId, content }).subscribe({
      next: comment => {
        this.cardComments.update(items => [...items, comment]);
        this.commentForm.reset();
        this.postingComment.set(false);
        this.toast.success('Comment posted.');
      },
      error: () => {
        this.postingComment.set(false);
        this.toast.error('Could not post comment.');
      }
    });
  }

  statusLabel(status?: string): string {
    return (status || 'TO_DO').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, value => value.toUpperCase());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
