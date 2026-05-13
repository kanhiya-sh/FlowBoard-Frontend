import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, switchMap, takeUntil } from 'rxjs';
import { Board } from '../../core/models/board.model';
import { Workspace, WorkspaceMember } from '../../core/models/workspace.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { BoardService } from '../../core/services/board.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-workspace',
  standalone: false,
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss'
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  // Async state in signals; click-toggled modals stay as plain fields.
  readonly workspace = signal<Workspace | undefined>(undefined);
  readonly boards = signal<Board[]>([]);
  readonly members = signal<WorkspaceMember[]>([]);
  readonly currentUser = signal<User | null>(null);
  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  boardModal = false;
  inviteModal = false;
  boardForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    background: ['#0052cc'],
    visibility: ['PRIVATE', Validators.required]
  });
  inviteForm = this.fb.group({
    query: [''],
    userId: [0, Validators.required],
    role: ['MEMBER', Validators.required]
  });
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private workspacesApi: WorkspaceService,
    private boardsApi: BoardService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => this.currentUser.set(user));

    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        this.loading.set(true);
        return forkJoin({
          workspace: this.workspacesApi.getWorkspace(id),
          boards: this.boardsApi.getBoardsByWorkspace(id),
          members: this.workspacesApi.getMembers(id)
        });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: data => {
        this.workspace.set(data.workspace);
        this.boards.set(data.boards);
        this.members.set(data.members);
        this.loading.set(false);
      },
      error: () => { this.toast.error('Could not load workspace.'); this.loading.set(false); }
    });
  }

  searchUsers(): void {
    const query = this.inviteForm.controls.query.value || '';
    if (query.trim().length < 2) return;
    this.auth.searchUsers(query.trim()).subscribe(users => this.users.set(users));
  }

  createBoard(): void {
    const ws = this.workspace();
    if (!ws || this.boardForm.invalid) return;
    const value = this.boardForm.getRawValue();
    this.boardsApi.createBoard({
      workspaceId: ws.workspaceId,
      name: value.name || '',
      description: value.description || '',
      background: value.background || '#0052cc',
      visibility: value.visibility || 'PRIVATE'
    }).subscribe({
      next: board => {
        this.boards.update(items => [board, ...items]);
        this.boardModal = false;
        this.boardForm.reset({ background: '#0052cc', visibility: 'PRIVATE' });
        this.toast.success('Board created.');
      },
      error: () => this.toast.error('Could not create board.')
    });
  }

  invite(): void {
    const ws = this.workspace();
    if (!ws || this.inviteForm.invalid || !this.inviteForm.controls.userId.value) {
      this.inviteForm.markAllAsTouched();
      this.toast.error('Choose a user to invite.');
      return;
    }
    const value = this.inviteForm.getRawValue();
    this.workspacesApi.addMember(ws.workspaceId, { userId: Number(value.userId), role: value.role as 'ADMIN' | 'MEMBER' }).subscribe({
      next: member => {
        this.members.update(items => [...items, member]);
        this.inviteModal = false;
        this.toast.success('Member invited.');
      },
      error: () => this.toast.error('Could not invite member.')
    });
  }

  toggleVisibility(): void {
    const current = this.workspace();
    if (!current) return;
    const newVis: 'PUBLIC' | 'PRIVATE' = current.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';

    // Optimistic UI update so the badge flips instantly.
    this.workspace.set({ ...current, visibility: newVis });

    // Backend WorkspaceRequestDTO requires @NotBlank name + @NotNull visibility,
    // so we MUST resend name (and description) along with the new visibility,
    // otherwise Spring validation returns 400 Bad Request.
    this.workspacesApi.updateWorkspace(current.workspaceId, {
      name: current.name,
      description: current.description,
      visibility: newVis
    }).subscribe({
      next: ws => {
        this.workspace.set(ws);
        this.workspacesApi.triggerRefresh();
        this.toast.success(`Workspace is now ${newVis}.`);
      },
      error: () => {
        // Roll back optimistic change
        this.workspace.set(current);
        this.toast.error('Could not update visibility.');
      }
    });
  }

  deleteWorkspace(): void {
    const ws = this.workspace();
    if (!ws || !confirm('Delete this workspace?')) return;
    const id = ws.workspaceId;

    const finalize = () => {
      this.workspacesApi.triggerRefresh();
      this.toast.success('Workspace deleted.');
      this.router.navigate(['/dashboard']);
    };

    this.workspacesApi.deleteWorkspace(id).subscribe({
      next: () => finalize(),
      error: (err) => {
        // 404 means the workspace is already gone server-side — treat as success.
        if (err?.status === 404) { finalize(); return; }
        this.toast.error('Could not delete workspace.');
      }
    });
  }

  // Email-first display per app-wide convention. Falls back to current user's
  // email (when the row is the logged-in user and the API didn't include it),
  // and finally to "User #id" if no email is resolvable.
  memberDisplayName(member: WorkspaceMember): string {
    if (member.email) return member.email;
    const me = this.currentUser();
    if (me?.userId === member.userId && me.email) {
      return me.email;
    }
    return `User #${member.userId}`;
  }

  memberInitial(member: WorkspaceMember): string {
    return this.memberDisplayName(member).trim().charAt(0).toUpperCase() || 'U';
  }

  isOwner(): boolean {
    const me = this.currentUser();
    const ws = this.workspace();
    return !!me && !!ws && me.userId === ws.ownerId;
  }

  isAdminMember(): boolean {
    const me = this.currentUser();
    return !!me && this.members().some(m => m.userId === me.userId && m.role === 'ADMIN');
  }

  canManageWorkspace(): boolean {
    return this.isOwner() || this.isAdminMember();
  }

  // Show the remove action only if:
  //  - current user is owner or workspace admin
  //  - the target row is NOT the workspace owner (owners can't be kicked)
  //  - the target row is NOT the current user (prevents accidental self-removal)
  canRemoveMember(member: WorkspaceMember): boolean {
    const ws = this.workspace();
    const me = this.currentUser();
    if (!this.canManageWorkspace() || !ws) return false;
    if (member.userId === ws.ownerId) return false;
    if (me?.userId === member.userId) return false;
    return true;
  }

  removeMember(member: WorkspaceMember): void {
    const ws = this.workspace();
    if (!ws || !this.canRemoveMember(member)) return;
    const label = this.memberDisplayName(member);
    if (!confirm(`Remove ${label} from this workspace? They will immediately lose access to all boards and cards in it.`)) return;

    // Optimistic UI — drop the row right away.
    const previous = this.members();
    this.members.set(previous.filter(m => m.userId !== member.userId));

    this.workspacesApi.removeMember(ws.workspaceId, member.userId).subscribe({
      next: () => {
        this.workspacesApi.triggerRefresh();
        this.toast.success(`${label} removed.`);
      },
      error: (err) => {
        // 404 means they're already gone server-side — keep UI clean.
        if (err?.status === 404) {
          this.workspacesApi.triggerRefresh();
          return;
        }
        // Real failure: roll back and surface it.
        this.members.set(previous);
        this.toast.error('Could not remove member.');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
