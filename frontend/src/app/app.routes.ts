import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

const ROLES_NOT_WORKER = roleGuard('ADMIN', 'HR', 'MANAGER', 'TECH_LEAD', 'QA_SPECIALIST');

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'workload-entry',
        loadComponent: () =>
          import('./features/workload-entry/workload-entry.component').then(
            (m) => m.WorkloadEntryComponent,
          ),
      },
      {
        path: 'workload-list',
        loadComponent: () =>
          import('./features/workload-list/workload-list.component').then(
            (m) => m.WorkloadListComponent,
          ),
      },
      {
        path: 'yearly-report',
        canActivate: [ROLES_NOT_WORKER],
        loadComponent: () =>
          import('./features/yearly-report/yearly-report.component').then(
            (m) => m.YearlyReportComponent,
          ),
      },
      {
        path: 'users',
        canActivate: [ROLES_NOT_WORKER],
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'lookups',
        canActivate: [ROLES_NOT_WORKER],
        loadComponent: () =>
          import('./features/lookups/lookups.component').then((m) => m.LookupsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
