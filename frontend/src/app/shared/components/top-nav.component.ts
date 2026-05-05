import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  BarChart3,
  Users,
  Settings,
  LogOut,
  type LucideIconData,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { RoleCode } from '../../core/models/role';

interface MenuItem {
  key: string;
  path: string;
  /** Translation key under `nav.*` in the i18n dictionaries. */
  labelKey: string;
  icon: LucideIconData;
}

const ALL_MENU: MenuItem[] = [
  { key: 'dashboard',      path: '/dashboard',      labelKey: 'nav.dashboard',       icon: LayoutDashboard },
  { key: 'workload-entry', path: '/workload-entry', labelKey: 'nav.workload_entry',  icon: ClipboardList },
  { key: 'workload-list',  path: '/workload-list',  labelKey: 'nav.workload_list',   icon: FolderOpen },
  { key: 'yearly-report',  path: '/yearly-report',  labelKey: 'nav.yearly_report',   icon: BarChart3 },
  { key: 'users',          path: '/users',          labelKey: 'nav.users',           icon: Users },
  { key: 'lookups',        path: '/lookups',        labelKey: 'nav.lookups',         icon: Settings },
];

const MENU_BY_ROLE: Record<RoleCode, string[]> = {
  ADMIN:         ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  HR:            ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  MANAGER:       ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  TECH_LEAD:     ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  QA_SPECIALIST: ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  WORKER:        ['dashboard', 'workload-entry', 'workload-list'],
};

const ROLE_LABEL: Record<RoleCode, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  TECH_LEAD: 'Technical Lead',
  QA_SPECIALIST: 'QA Specialist',
  WORKER: 'Worker',
};

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.css',
})
export class TopNavComponent {
  private readonly authService = inject(AuthService);
  protected readonly localeService = inject(LocaleService);

  readonly currentUser = this.authService.currentUser;
  readonly logOutIcon = LogOut;

  readonly menu = computed<MenuItem[]>(() => {
    const role = this.authService.roleCode();
    if (!role) return [];
    const allowed = new Set(MENU_BY_ROLE[role] ?? []);
    return ALL_MENU.filter((m) => allowed.has(m.key));
  });

  toggleLocale(): void {
    this.localeService.toggle();
  }

  readonly roleLabel = computed<string>(() => {
    const role = this.authService.roleCode();
    return role ? ROLE_LABEL[role] : '';
  });

  readonly initials = computed<string>(() => {
    const name = this.currentUser()?.name ?? '';
    return name
      .split(' ')
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  });

  readonly firstName = computed<string>(() => {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ')[0] ?? '';
  });

  readonly profileOpen = signal(false);

  toggleProfile(): void {
    this.profileOpen.update((v) => !v);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  logout(): void {
    this.profileOpen.set(false);
    this.authService.logout();
  }
}
