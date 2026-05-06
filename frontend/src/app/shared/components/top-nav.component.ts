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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  type LucideIconData,
} from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { RoleCode } from '../../core/models/role';

interface MenuLeaf {
  type: 'leaf';
  key: string;
  path: string;
  labelKey: string;
  icon: LucideIconData;
  /** Roles that may see this leaf. Undefined = everyone authenticated. */
  allow?: RoleCode[];
}

interface MenuGroup {
  type: 'group';
  key: string;
  labelKey: string;
  icon: LucideIconData;
  children: MenuLeaf[];
}

type MenuEntry = MenuLeaf | MenuGroup;

const ROLES_NOT_WORKER: RoleCode[] = ['ADMIN', 'HR', 'MANAGER', 'TECH_LEAD', 'QA_SPECIALIST'];

const MENU_TREE: MenuEntry[] = [
  {
    type: 'leaf',
    key: 'dashboard',
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
  },
  {
    type: 'group',
    key: 'workload',
    labelKey: 'nav.workload_group',
    icon: ClipboardList,
    children: [
      { type: 'leaf', key: 'workload-entry', path: '/workload-entry', labelKey: 'nav.workload_entry', icon: Plus },
      { type: 'leaf', key: 'workload-list',  path: '/workload-list',  labelKey: 'nav.workload_list',  icon: FolderOpen },
      { type: 'leaf', key: 'yearly-report',  path: '/yearly-report',  labelKey: 'nav.yearly_report',  icon: BarChart3, allow: ROLES_NOT_WORKER },
    ],
  },
  {
    type: 'group',
    key: 'management',
    labelKey: 'nav.management_group',
    icon: Settings,
    children: [
      { type: 'leaf', key: 'lookups', path: '/lookups', labelKey: 'nav.lookups', icon: Settings, allow: ROLES_NOT_WORKER },
      { type: 'leaf', key: 'users',   path: '/users',   labelKey: 'nav.users',   icon: Users,    allow: ROLES_NOT_WORKER },
    ],
  },
];

const ROLE_LABEL: Record<RoleCode, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  MANAGER: 'Manager',
  TECH_LEAD: 'Technical Lead',
  QA_SPECIALIST: 'QA Specialist',
  WORKER: 'Worker',
};

const COLLAPSED_KEY = 'workload.sidenav.collapsed';
const GROUPS_KEY = 'workload.sidenav.expandedGroups';

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

  // Icons exposed to the template
  readonly logOutIcon = LogOut;
  readonly chevronLeftIcon = ChevronLeft;
  readonly chevronRightIcon = ChevronRight;
  readonly chevronDownIcon = ChevronDown;

  // --- Sidebar collapse state ---
  readonly collapsed = signal<boolean>(this.readBool(COLLAPSED_KEY, false));

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    // Closing the profile popover on collapse keeps things tidy.
    this.profileOpen.set(false);
  }

  // --- Group expand state (persists per group) ---
  private readonly _expandedGroups = signal<Set<string>>(this.readGroups());

  isGroupExpanded(key: string): boolean {
    return this._expandedGroups().has(key);
  }
  toggleGroup(key: string): void {
    // When collapsed, expand the sidebar AND open the group.
    if (this.collapsed()) {
      this.collapsed.set(false);
      try { localStorage.setItem(COLLAPSED_KEY, '0'); } catch { /* ignore */ }
    }
    this._expandedGroups.update((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      this.persistGroups(next);
      return next;
    });
  }

  // --- Menu filtered by role ---
  readonly menu = computed<MenuEntry[]>(() => {
    const role = this.authService.roleCode();
    if (!role) return [];
    const filterLeaf = (l: MenuLeaf): boolean => !l.allow || l.allow.includes(role);
    const out: MenuEntry[] = [];
    for (const e of MENU_TREE) {
      if (e.type === 'leaf') {
        if (filterLeaf(e)) out.push(e);
      } else {
        const visibleChildren = e.children.filter(filterLeaf);
        if (visibleChildren.length > 0) {
          out.push({ ...e, children: visibleChildren });
        }
      }
    }
    return out;
  });

  // Cast helpers for template (Angular's narrow-from-discriminator is finicky in templates).
  asGroup(e: MenuEntry): MenuGroup { return e as MenuGroup; }
  asLeaf(e: MenuEntry): MenuLeaf { return e as MenuLeaf; }

  // --- Profile / role display ---
  readonly roleLabel = computed<string>(() => {
    const role = this.authService.roleCode();
    return role ? ROLE_LABEL[role] : '';
  });

  readonly initials = computed<string>(() => {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  });

  readonly firstName = computed<string>(() => {
    const name = this.currentUser()?.name ?? '';
    return name.split(' ')[0] ?? '';
  });

  readonly profileOpen = signal(false);

  toggleProfile(): void { this.profileOpen.update((v) => !v); }
  closeProfile(): void { this.profileOpen.set(false); }
  logout(): void {
    this.profileOpen.set(false);
    this.authService.logout();
  }

  toggleLocale(): void { this.localeService.toggle(); }

  // --- localStorage helpers ---
  private readBool(key: string, fallback: boolean): boolean {
    try {
      const v = localStorage.getItem(key);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch { /* ignore */ }
    return fallback;
  }
  private readGroups(): Set<string> {
    try {
      const raw = localStorage.getItem(GROUPS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch { /* ignore */ }
    // Default: workload group expanded, management collapsed
    return new Set(['workload']);
  }
  private persistGroups(s: Set<string>): void {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
  }
}
