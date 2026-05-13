import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { OAuthCallbackComponent } from './features/auth/oauth-callback/oauth-callback.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { WorkspaceComponent } from './features/workspace/workspace.component';
import { BoardComponent } from './features/board/board.component';
import { CardDetailComponent } from './features/card-detail/card-detail.component';
import { ProfileComponent } from './features/profile/profile.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { PublicWorkspaceComponent } from './features/public-workspace/public-workspace.component';

const routes: Routes = [
  // ── Public routes (no auth required) ────────────────────────────────────────
  { path: 'login',    component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // OAuth2 callback routes — must be public, no guard
  { path: 'oauth/callback',          component: OAuthCallbackComponent },
  { path: 'oauth2/redirect',         component: OAuthCallbackComponent },
  { path: 'login/oauth2/code/google', component: OAuthCallbackComponent },

  // ── Protected routes (AuthGuard) ─────────────────────────────────────────────
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'workspace/:id', component: WorkspaceComponent },
      { path: 'board/:id', component: BoardComponent },
      { path: 'board/:boardId/card/:cardId', component: CardDetailComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'public/workspace/:id', component: PublicWorkspaceComponent }
    ]
  },

  // ── Fallback — unknown route → login (NOT dashboard, avoids redirect loop) ───
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
