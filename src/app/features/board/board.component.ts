import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { Board } from '../../core/models/board.model';
import { Card } from '../../core/models/card.model';
import { TaskList } from '../../core/models/list.model';
import { BoardService } from '../../core/services/board.service';
import { CardService } from '../../core/services/card.service';
import { ListService } from '../../core/services/list.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-board',
  standalone: false,
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss'
})
export class BoardComponent implements OnInit, OnDestroy {
  // Async-driven state in signals; click-toggled UI state stays as plain fields.
  // Note: list/card mutations during drag-drop are still in-place on the
  // signal's underlying array (CDK's moveItemInArray needs that). We then call
  // `.set([...])` to re-emit so signal subscribers see the new identity.
  readonly board = signal<Board | undefined>(undefined);
  readonly lists = signal<TaskList[]>([]);
  readonly archivedLists = signal<TaskList[]>([]);
  readonly loading = signal(true);
  readonly archivedLoading = signal(false);
  addListOpen = false;
  archivedPanelOpen = false;
  activeCardId?: number;
  private dragging = false;
  listForm = this.fb.group({ name: ['', Validators.required], color: ['#0052cc'] });
  cardForms = new Map<number, ReturnType<FormBuilder['group']>>();
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private boardsApi: BoardService,
    private listsApi: ListService,
    private cardsApi: CardService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const boardId = Number(params.get('id'));
        this.loading.set(true);
        return forkJoin({
          board: this.boardsApi.getBoard(boardId),
          lists: this.listsApi.getListsByBoard(boardId)
        });
      }),
      switchMap(data => {
        this.board.set(data.board);
        if (!data.lists.length) return of([] as TaskList[]);
        return forkJoin(data.lists.map(list => this.cardsApi.getCardsByList(list.listId).pipe(
          switchMap(cards => of({ ...list, cards }))
        )));
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: lists => {
        this.lists.set(lists);
        lists.forEach(list => this.ensureCardForm(list.listId));
        this.loading.set(false);
      },
      error: () => { this.toast.error('Could not load board.'); this.loading.set(false); }
    });
  }

  getDropListIds(): string[] {
    return this.lists().map(list => 'list-' + list.listId);
  }

  trackList(_: number, list: TaskList): number {
    return list.listId;
  }

  trackCard(_: number, card: Card): number {
    return card.cardId;
  }

  ensureCardForm(listId: number): ReturnType<FormBuilder['group']> {
    if (!this.cardForms.has(listId)) {
      this.cardForms.set(listId, this.fb.group({ title: ['', Validators.required] }));
    }
    return this.cardForms.get(listId)!;
  }

  createList(): void {
    const board = this.board();
    if (!board || this.listForm.invalid) return;
    const value = this.listForm.getRawValue();
    this.listsApi.createList({ boardId: board.boardId, name: value.name || '', color: value.color || '#0052cc' }).subscribe({
      next: list => {
        this.lists.update(items => [...items, { ...list, cards: [] }]);
        this.ensureCardForm(list.listId);
        this.listForm.reset({ color: '#0052cc' });
        this.addListOpen = false;
      },
      error: () => this.toast.error('Could not add list.')
    });
  }

  createCard(list: TaskList): void {
    const board = this.board();
    if (!board) return;
    const form = this.ensureCardForm(list.listId);
    if (form.invalid || form.disabled) return;
    const title = String(form.get('title')?.value || '');
    form.disable();
    this.cardsApi.createCard({ listId: list.listId, boardId: board.boardId, title, priority: 'MEDIUM', status: 'TO_DO' }).subscribe({
      next: card => {
        // mutate the underlying list object in place so existing refs stay
        // valid, then re-emit a fresh array so the signal change-tracks.
        list.cards = [...(list.cards || []), card];
        this.lists.update(items => [...items]);
        form.reset();
        form.enable();
      },
      error: () => { this.toast.error('Could not add card.'); form.enable(); }
    });
  }

  saveListName(list: TaskList, name: string): void {
    const trimmed = name.trim();
    list.editing = false;
    if (!trimmed || trimmed === list.name) return;
    const previous = list.name;
    list.name = trimmed;
    this.lists.update(items => [...items]);
    this.listsApi.updateList(list.listId, { boardId: list.boardId, name: trimmed, color: list.color }).subscribe({
      error: () => {
        list.name = previous;
        this.lists.update(items => [...items]);
        this.toast.error('Could not rename list.');
      }
    });
  }

  archiveList(list: TaskList): void {
    this.listsApi.archiveList(list.listId).subscribe({
      next: archived => {
        this.lists.update(items => items.filter(item => item.listId !== list.listId));
        this.archivedLists.update(items => [{ ...archived, cards: [] }, ...items.filter(l => l.listId !== list.listId)]);
        this.toast.success('List archived.');
      },
      error: (err: HttpErrorResponse) => this.handleListActionError(err, 'Could not archive list.')
    });
  }

  deleteList(list: TaskList): void {
    if (!confirm('Delete this list permanently? This cannot be undone.')) return;
    this.listsApi.deleteList(list.listId).subscribe({
      next: () => {
        this.lists.update(items => items.filter(item => item.listId !== list.listId));
        this.archivedLists.update(items => items.filter(item => item.listId !== list.listId));
        this.toast.success('List deleted.');
      },
      error: (err: HttpErrorResponse) => this.handleListActionError(err, 'Could not delete list.')
    });
  }

  toggleArchivedPanel(): void {
    this.archivedPanelOpen = !this.archivedPanelOpen;
    if (this.archivedPanelOpen) this.loadArchivedLists();
  }

  loadArchivedLists(): void {
    const board = this.board();
    if (!board) return;
    this.archivedLoading.set(true);
    this.listsApi.getArchivedLists(board.boardId).subscribe({
      next: lists => { this.archivedLists.set(lists); this.archivedLoading.set(false); },
      error: () => { this.archivedLoading.set(false); this.toast.error('Could not load archived lists.'); }
    });
  }

  unarchiveList(list: TaskList): void {
    this.listsApi.unarchiveList(list.listId).subscribe({
      next: restored => {
        this.archivedLists.update(items => items.filter(item => item.listId !== list.listId));
        this.lists.update(items => [...items, { ...restored, cards: [] }]);
        this.ensureCardForm(restored.listId);
        this.toast.success('List restored.');
        if (this.board()) {
          this.cardsApi.getCardsByList(restored.listId).subscribe(cards => {
            this.lists.update(items => items.map(l =>
              l.listId === restored.listId ? { ...l, cards } : l
            ));
          });
        }
      },
      error: (err: HttpErrorResponse) => this.handleListActionError(err, 'Could not restore list.')
    });
  }

  deleteArchivedList(list: TaskList): void {
    if (!confirm('Delete this list permanently? This cannot be undone.')) return;
    this.listsApi.deleteList(list.listId).subscribe({
      next: () => {
        this.archivedLists.update(items => items.filter(item => item.listId !== list.listId));
        this.toast.success('List deleted.');
      },
      error: (err: HttpErrorResponse) => this.handleListActionError(err, 'Could not delete list.')
    });
  }

  private handleListActionError(err: HttpErrorResponse, fallbackMsg: string): void {
    if (err.status === 404) {
      this.toast.error('This list no longer exists. Refreshing…');
      this.refreshLists();
    } else if (err.status === 403) {
      this.toast.error('You are not allowed to perform this action.');
    } else if (err.status === 409) {
      this.toast.error(err.error?.message || 'Action conflicts with current state.');
    } else {
      this.toast.error(fallbackMsg);
    }
  }

  private refreshLists(): void {
    const board = this.board();
    if (!board) return;
    const boardId = board.boardId;
    this.listsApi.getListsByBoard(boardId).pipe(
      switchMap(lists => {
        if (!lists.length) return of([] as TaskList[]);
        return forkJoin(lists.map(list => this.cardsApi.getCardsByList(list.listId).pipe(
          switchMap(cards => of({ ...list, cards }))
        )));
      })
    ).subscribe({
      next: lists => {
        this.lists.set(lists);
        lists.forEach(list => this.ensureCardForm(list.listId));
      }
    });
    if (this.archivedPanelOpen) this.loadArchivedLists();
  }

  onListDrop(event: CdkDragDrop<TaskList[]>): void {
    const board = this.board();
    if (!board) return;
    // Snapshot for rollback BEFORE we mutate.
    const previous = this.lists();
    // Work on a copy so the signal sees a new array identity.
    const next = [...previous];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.lists.set(next);
    this.listsApi.reorderLists(board.boardId, next.map(list => list.listId)).subscribe({
      error: () => { this.lists.set(previous); this.toast.error('List order reverted.'); }
    });
  }

  onCardDrop(event: CdkDragDrop<Card[]>, targetList: TaskList): void {
    // Snapshot of every list's cards for rollback. The CDK has already mutated
    // the connected card arrays in-place by the time this fires, so we cannot
    // capture the *pre*-mutation state here — instead we rebuild lists with
    // a re-emitted signal value so the view reflects the move synchronously.
    const snapshots = this.lists().map(list => ({ list, cards: [...(list.cards || [])] }));
    this.dragging = false;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.lists.update(items => [...items]);
      this.cardsApi.reorderCards(targetList.listId, event.container.data.map(c => c.cardId)).subscribe({
        error: () => this.revertCards(snapshots)
      });
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      const movedCard = event.container.data[event.currentIndex];
      movedCard.listId = targetList.listId;
      this.lists.update(items => [...items]);
      this.cardsApi.moveCard(movedCard.cardId, { targetListId: targetList.listId, position: event.currentIndex }).subscribe({
        error: () => this.revertCards(snapshots)
      });
    }
  }

  onDragStarted(): void {
    this.dragging = true;
  }

  openCard(card: Card): void {
    if (this.dragging) {
      this.dragging = false;
      return;
    }
    const board = this.board();
    if (!board) return;
    this.activeCardId = card.cardId;
    this.router.navigate(['/board', board.boardId, 'card', card.cardId]);
  }

  isOverdue(card: Card): boolean {
    return !!card.dueDate && new Date(card.dueDate).getTime() < Date.now() && card.status !== 'DONE';
  }

  statusLabel(status?: string): string {
    return (status || 'TO_DO').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, value => value.toUpperCase());
  }

  private revertCards(snapshots: { list: TaskList; cards: Card[] }[]): void {
    snapshots.forEach(snapshot => snapshot.list.cards = snapshot.cards);
    // Re-emit so the signal-bound template reflects the rollback immediately.
    this.lists.update(items => [...items]);
    this.toast.error('Card move reverted.');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
