import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Workspace } from '../../../core/models/workspace.model';
import { WorkspaceService } from '../../../core/services/workspace.service';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  // Async data → signal so the sidebar always paints the latest workspace
  // list without depending on zone-patched XHR microtask CD timing.
  readonly workspaces = signal<Workspace[]>([]);
  collapsed = false;
  private destroy$ = new Subject<void>();

  constructor(private workspaceService: WorkspaceService) {}

  ngOnInit(): void {
    this.load();
    this.workspaceService.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
  }

  private load(): void {
    this.workspaceService.getMyWorkspaces().pipe(takeUntil(this.destroy$)).subscribe({
      next: items => this.workspaces.set(items),
      error: () => this.workspaces.set([])
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
