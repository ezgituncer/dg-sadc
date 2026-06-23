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
  PositionsService,
  RolesService,
  TeamsService,
  UserDirectoryEntry,
  UsersService,
} from '../../core/services/users.service';
import { LocaleService } from '../../core/services/locale.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ToastComponent } from '../../shared/components/toast.component';

interface OrgNodeData {
  user: UserDirectoryEntry;
  reports: OrgNodeData[];
}

// Root position names whose subtrees go into the side panels instead of the
// main org tree. These names match the seeded positions table 1:1; renaming a
// position in DB would silently break this.
const HR_SUBTREE_ROOT = 'HR Manager';
const QA_SUBTREE_ROOT = 'QA Lead';
const BUSINESS_SUBTREE_ROOT = 'Business PLR';

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
  protected readonly positions = inject(PositionsService);
  private readonly localeSvc = inject(LocaleService);

  /** True if `positionId` is the given name or a descendant of it in the
   *  position tree. Walks up via `parentPositionId`. */
  private isInPositionSubtree(positionId: number | null, rootName: string): boolean {
    let pos = this.positions.byId(positionId);
    let guard = 50; // safety against malformed cycles
    while (pos && guard-- > 0) {
      if (pos.name === rootName) return true;
      pos = this.positions.byId(pos.parentPositionId);
    }
    return false;
  }

  /** Positions that always render as their own card with children below. All
   *  other positions (including Tech Lead, workers) render in the parent's
   *  roster strip. Kept in sync with `cardPositionLabel` minus TL. */
  private isBranchPosition(positionName: string | null | undefined): boolean {
    if (!positionName) return false;
    const name = positionName.trim();
    return (
      name === 'Director' ||
      name === 'Head of Engineering' ||
      name === 'Engineering Manager' ||
      name === 'Product Manager' ||
      name === 'Product Owner'
    );
  }

  readonly saveIcon = Save;

  readonly users = signal<UserDirectoryEntry[]>([]);
  readonly loading = signal(true);

  // --- Export to PNG ---
  /** Wrapper containing the org tree + outside-tree section — what we screenshot. */
  private readonly exportTargetRef = viewChild<ElementRef<HTMLElement>>('exportTarget');
  readonly exporting = signal(false);
  readonly toast = signal<{ message: string; kind: 'success' | 'error' } | null>(null);

  // The directory endpoint already returns only active users.
  readonly activeUsers = computed(() => this.users());

  // Tree contains everyone whose position is not under HR or QA.
  readonly roots = computed<OrgNodeData[]>(() => {
    // Touch the positions signal so the tree recomputes when positions load.
    this.positions.list();
    const all = this.activeUsers();
    const eligible = all.filter(
      (u) =>
        !this.isInPositionSubtree(u.positionId, HR_SUBTREE_ROOT) &&
        !this.isInPositionSubtree(u.positionId, QA_SUBTREE_ROOT) &&
        !this.isInPositionSubtree(u.positionId, BUSINESS_SUBTREE_ROOT),
    );
    return eligible
      .filter(
        (u) =>
          !u.managerAccountId ||
          !eligible.some((p) => p.accountId === u.managerAccountId),
      )
      .map((u) => this.buildNode(u, eligible))
      .sort((a, b) => a.user.name.localeCompare(b.user.name, 'tr'));
  });

  readonly businessUsers = computed(() => {
    this.positions.list();
    return this.activeUsers().filter((u) =>
      this.isInPositionSubtree(u.positionId, BUSINESS_SUBTREE_ROOT),
    );
  });

  readonly hrUsers = computed(() => {
    this.positions.list();
    return this.activeUsers().filter((u) =>
      this.isInPositionSubtree(u.positionId, HR_SUBTREE_ROOT),
    );
  });
  readonly qaUsers = computed(() => {
    this.positions.list();
    return this.activeUsers().filter((u) =>
      this.isInPositionSubtree(u.positionId, QA_SUBTREE_ROOT),
    );
  });

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
    // Use the directory endpoint (open to every authenticated user, incl. workers)
    // rather than GET /users which requires the users.view permission.
    this.api
      .loadDirectory()
      .then((map) => {
        this.users.set(Array.from(map.values()));
        this.loading.set(false);
      })
      .catch(() => this.loading.set(false));
  }

  private buildNode(user: UserDirectoryEntry, pool: UserDirectoryEntry[]): OrgNodeData {
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

  /** Children rendered as their own card (Director/HEM/EM/PM/PO). */
  branchReports(node: OrgNodeData): OrgNodeData[] {
    return node.reports.filter((r) => this.isBranchPosition(r.user.positionName));
  }

  /** Position pill text for a card. Returns the full position name only for
   *  Director / HEM / EM; short abbreviations for TL / PM / PO; null (no pill)
   *  for everything else. */
  cardPositionLabel(positionName: string | null | undefined): string | null {
    if (!positionName) return null;
    const name = positionName.trim();
    if (name === 'Director') return 'Director';
    if (name === 'Head of Engineering') return 'Head of Engineering';
    if (name === 'Engineering Manager') return 'Engineering Manager';
    if (name === 'Product Manager') return 'PM';
    if (name === 'Product Owner') return 'PO';
    if (/Tech Lead$/i.test(name)) return 'TL';
    return null;
  }

  /** CSS class paired with `cardPositionLabel` — keyed off the same set. The
   *  styles live in dashboard.component.css (`.pos-director`, `.pos-hem`, etc).
   *  Returns '' (no class) when there is no pill. */
  cardPositionClass(positionName: string | null | undefined): string {
    if (!positionName) return '';
    const name = positionName.trim();
    if (name === 'Director') return 'pos-director';
    if (name === 'Head of Engineering') return 'pos-hem';
    if (name === 'Engineering Manager') return 'pos-em';
    if (name === 'Product Manager') return 'pos-pm';
    if (name === 'Product Owner') return 'pos-po';
    if (/Tech Lead$/i.test(name)) return 'pos-tl';
    return '';
  }

  /** Everyone else — compact roster strip under the parent card. */
  rosterReports(node: OrgNodeData): OrgNodeData[] {
    return node.reports.filter((r) => !this.isBranchPosition(r.user.positionName));
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
