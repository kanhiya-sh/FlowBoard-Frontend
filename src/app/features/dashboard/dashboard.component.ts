import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { Workspace } from '../../core/models/workspace.model';
import { AuthService } from '../../core/services/auth.service';
import { BoardService } from '../../core/services/board.service';
import { CardService } from '../../core/services/card.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // ── Async-driven state is held in signals so HTTP responses always trigger
  // change detection without relying on zone-patched XHR microtask timing.
  // Click-toggled state (`modalOpen`) stays as a plain field — synchronous
  // event handlers already fire CD reliably via zone.js.
  readonly workspaces = signal<Workspace[]>([]);
  readonly loading = signal(true);
  readonly stats = signal({ workspaces: 0, members: 0, myCards: 0, boards: 0 });
  modalOpen = false;
  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    visibility: ['PRIVATE', Validators.required]
  });
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private workspacesApi: WorkspaceService,
    private boardsApi: BoardService,
    private cardsApi: CardService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const user = this.auth.getCurrentUser();
    this.workspacesApi.getMyWorkspaces().pipe(takeUntil(this.destroy$)).subscribe({
      next: items => {
        this.workspaces.set(items);
        this.stats.set({
          workspaces: items.length,
          members: items.reduce((sum, w) => sum + (w.memberCount || 0), 0),
          myCards: this.stats().myCards,
          boards: 0
        });
        this.loading.set(false);

        // Load total boards across all workspaces
        if (items.length) {
          forkJoin(items.map(w => this.boardsApi.getBoardsByWorkspace(w.workspaceId)))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: allBoards => this.stats.update(s => ({
                ...s,
                boards: allBoards.reduce((sum, list) => sum + list.length, 0)
              })),
              error: () => {}
            });
        }

        // Load user's assigned cards count
        if (user?.userId) {
          this.cardsApi.getCardsByAssignee(user.userId).pipe(takeUntil(this.destroy$)).subscribe({
            next: cards => this.stats.update(s => ({ ...s, myCards: cards.length })),
            error: () => {}
          });
        }
      },
      error: () => { this.toast.error('Could not load workspaces.'); this.loading.set(false); }
    });
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.workspacesApi.createWorkspace({
      name: value.name || '',
      description: value.description || '',
      visibility: value.visibility as 'PUBLIC' | 'PRIVATE'
    }).subscribe({
      next: workspace => {
        this.workspaces.update(items => [workspace, ...items]);
        this.modalOpen = false;
        this.form.reset({ visibility: 'PRIVATE' });
        this.toast.success('Workspace created.');
        this.workspacesApi.triggerRefresh();
      },
      error: () => this.toast.error('Could not create workspace.')
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
