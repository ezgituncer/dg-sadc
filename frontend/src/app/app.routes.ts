import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

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
        path: 'my-workload',
        loadComponent: () =>
          import('./features/my-workload/my-workload.component').then(
            (m) => m.MyWorkloadComponent,
          ),
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
        canActivate: [permissionGuard('yearly_report.view')],
        loadComponent: () =>
          import('./features/yearly-report/yearly-report.component').then(
            (m) => m.YearlyReportComponent,
          ),
      },
      {
        path: 'users',
        canActivate: [permissionGuard('users.view')],
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'lookups',
        canActivate: [permissionGuard('lookups.view')],
        loadComponent: () =>
          import('./features/lookups/lookups.component').then((m) => m.LookupsComponent),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard('roles.view', 'roles.manage')],
        loadComponent: () =>
          import('./features/roles/roles.component').then((m) => m.RolesComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
