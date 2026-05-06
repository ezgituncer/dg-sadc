import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Save } from 'lucide-angular';

import {
  RolesService,
  TeamsService,
  UsersService,
} from '../../core/services/users.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ToastComponent } from '../../shared/components/toast.component';
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
  imports: [CommonModule, LucideAngularModule, TranslatePipe, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(UsersService);
  protected readonly roles = inject(RolesService);
  protected readonly teams = inject(TeamsService);
  private readonly localeSvc = inject(LocaleService);

  readonly saveIcon = Save;

  readonly users = signal<UserListItem[]>([]);
  readonly loading = signal(true);

  // --- Export to PNG ---
  /** Wrapper containing the org tree + outside-tree section — what we screenshot. */
  private readonly exportTargetRef = viewChild<ElementRef<HTMLElement>>('exportTarget');
  readonly exporting = signal(false);
  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);

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

  /** Capture the tree + outside-tree section as a single PNG and trigger a download.
   *
   *  The live `.tree-scroll` clips the org tree with `overflow-x: auto`, so html2canvas
   *  on the live element only captures the visible viewport slice. To get the full tree:
   *
   *  1. Deep-clone the `#exportTarget` wrapper into an off-screen container.
   *  2. Inside the clone, drop the overflow constraint and let the layout grow to its
   *     natural content width (so the full tree spreads out).
   *  3. Render the clone with html2canvas; remove the off-screen container.
   *
   *  This avoids mutating the visible DOM (no flicker for the user) and gives a complete
   *  image regardless of how wide the tree is. */
  async exportPng(): Promise<void> {
    if (this.exporting()) return;
    const target = this.exportTargetRef()?.nativeElement;
    if (!target) return;

    this.exporting.set(true);

    const offscreen = document.createElement('div');
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (offscreen.parentNode) offscreen.parentNode.removeChild(offscreen);
    };

    try {
      const { default: html2canvas } = await import('html2canvas');

      const clone = target.cloneNode(true) as HTMLElement;

      // Off-screen wrapper keeps the clone in the document (so styles compute) but out of
      // view and out of the visible layout flow.
      offscreen.style.cssText = [
        'position: fixed',
        'left: -100000px',
        'top: 0',
        'pointer-events: none',
        'width: max-content',
        'background: #0A1628',
        'padding: 24px',
      ].join(';');
      offscreen.style.fontFamily = getComputedStyle(document.body).fontFamily;

      // Drop the horizontal-clip on the cloned tree-scroll so the org tree expands to its
      // natural width inside the off-screen wrapper.
      clone.querySelectorAll<HTMLElement>('.tree-scroll').forEach((el) => {
        el.style.overflow = 'visible';
        el.style.width = 'max-content';
      });
      clone.style.width = 'max-content';

      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      // Yield once so the browser computes layout/styles for the clone.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(clone, {
        backgroundColor: '#0A1628',
        scale: window.devicePixelRatio > 1 ? 2 : 1.5,
        useCORS: true,
        logging: false,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      cleanup();

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `org-chart-${this.formatDate(new Date())}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      this.flashToast(this.localeSvc.t('dashboard.export_done'), 'success');
    } catch (err) {
      console.error('Export failed', err);
      this.flashToast(this.localeSvc.t('dashboard.export_failed'), 'error');
    } finally {
      cleanup();
      this.exporting.set(false);
    }
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private flashToast(message: string, kind: 'success' | 'error'): void {
    this.toast.set({ message, kind });
    setTimeout(() => this.toast.set(null), 2500);
  }
}
