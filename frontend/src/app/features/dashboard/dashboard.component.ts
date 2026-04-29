import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  RolesService,
  TeamsService,
  UsersService,
} from '../../core/services/users.service';
import { UserListItem } from '../../core/models/admin';

interface OrgNodeData {
  user: UserListItem;
  reports: OrgNodeData[];
}

const QA_TEAM_ID = 4;
// Roles whose users belong in the side panels rather than the org tree.
const HR_PANEL_ROLES = new Set(['HR']);
// Anyone in the QA team (any role) is shown in the QA side panel.
function isQaPanel(u: UserListItem): boolean {
  return u.teamId === QA_TEAM_ID;
}
function isHrPanel(u: UserListItem): boolean {
  return HR_PANEL_ROLES.has(u.roleCode);
}
// Roles that show up in their manager's roster panel instead of as their own card.
const ROSTER_ROLES = new Set(['WORKER', 'TECH_LEAD']);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(UsersService);
  protected readonly roles = inject(RolesService);
  protected readonly teams = inject(TeamsService);

  readonly users = signal<UserListItem[]>([]);
  readonly loading = signal(true);

  readonly activeUsers = computed(() => this.users().filter((u) => u.isActive));

  // Tree contains everyone who is not in the HR or QA side panels.
  readonly roots = computed<OrgNodeData[]>(() => {
    const all = this.activeUsers();
    const eligible = all.filter((u) => !isHrPanel(u) && !isQaPanel(u));
    return eligible
      .filter(
        (u) =>
          !u.managerAccountId ||
          !eligible.some((p) => p.accountId === u.managerAccountId),
      )
      .map((u) => this.buildNode(u, eligible))
      .sort((a, b) => a.user.name.localeCompare(b.user.name, 'tr'));
  });

  readonly hrUsers = computed(() => this.activeUsers().filter(isHrPanel));
  readonly qaUsers = computed(() => this.activeUsers().filter(isQaPanel));

  readonly stats = computed(() => {
    const all = this.activeUsers();
    return {
      total: all.length,
      managers: all.filter((u) => u.roleCode === 'MANAGER').length,
      techLeads: all.filter((u) => u.roleCode === 'TECH_LEAD').length,
      workers: all.filter((u) => u.roleCode === 'WORKER').length,
    };
  });

  ngOnInit(): void {
    this.api.list({ isActive: true }).subscribe({
      next: (res) => {
        this.users.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildNode(user: UserListItem, pool: UserListItem[]): OrgNodeData {
    const reports = pool
      .filter((u) => u.managerAccountId === user.accountId)
      .map((u) => this.buildNode(u, pool))
      .sort((a, b) => {
        // Tech leads above workers; otherwise alphabetic
        const ar = a.user.roleCode === 'TECH_LEAD' ? 0 : 1;
        const br = b.user.roleCode === 'TECH_LEAD' ? 0 : 1;
        if (ar !== br) return ar - br;
        return a.user.name.localeCompare(b.user.name, 'tr');
      });
    return { user, reports };
  }

  roleColor(roleCode: string): string {
    const map: Record<string, string> = {
      ADMIN: 'var(--c-red)',
      HR: 'var(--c-amber)',
      MANAGER: 'var(--c-purple)',
      TECH_LEAD: 'var(--c-teal)',
      QA_SPECIALIST: 'var(--c-pink)',
      WORKER: 'var(--c-blue)',
    };
    return map[roleCode] ?? 'var(--c-text-muted)';
  }

  roleLabel(roleCode: string): string {
    return this.roles.list().find((r) => r.code === roleCode)?.name ?? roleCode;
  }

  teamName(teamId: number | null): string {
    if (teamId == null) return '';
    return this.teams.byId(teamId)?.name ?? '';
  }

  /** Children that are managers — they expand the tree downward as cards. */
  branchReports(node: OrgNodeData): OrgNodeData[] {
    return node.reports.filter((r) => !ROSTER_ROLES.has(r.user.roleCode));
  }

  /** Children that are individual contributors (worker + tech-lead) — compact list. */
  rosterReports(node: OrgNodeData): OrgNodeData[] {
    return node.reports.filter((r) => ROSTER_ROLES.has(r.user.roleCode));
  }
}
