import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LookupService } from '../../core/services/lookup.service';
import { UsersService } from '../../core/services/users.service';
import { AppHeaderComponent } from './app-header.component';
import { TopNavComponent } from './top-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TopNavComponent, AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <app-top-nav />
      <div class="main-area">
        <app-header />
        <main>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        color: var(--c-text-primary);
        /* User-supplied /assets/images/app-bg.png — shown as-is, fixed on scroll. */
        background: url('/assets/images/app-bg.png') center/cover no-repeat fixed;
      }
      /* Two-column shell: sidebar (auto width) on the left, main area fills the rest.
       * The header lives at the top of the main area and is sticky there. */
      .shell {
        display: grid;
        grid-template-columns: auto 1fr;
        min-height: 100vh;
      }
      .main-area {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 100vh;
      }
      main {
        flex: 1;
        min-width: 0;
      }
    `,
  ],
})
export class AppShellComponent implements OnInit {
  private readonly lookups = inject(LookupService);
  private readonly users = inject(UsersService);

  ngOnInit(): void {
    if (!this.lookups.ready()) {
      this.lookups.loadAll().catch((err) => {
        console.error('Failed to load lookup data', err);
      });
    }
    this.users.loadDirectory().catch((err) => {
      console.error('Failed to load user directory', err);
    });
  }
}
