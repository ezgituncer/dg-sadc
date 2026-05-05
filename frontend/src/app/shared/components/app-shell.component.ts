import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LookupService } from '../../core/services/lookup.service';
import { UsersService } from '../../core/services/users.service';
import { TopNavComponent } from './top-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TopNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <app-top-nav />
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        color: var(--c-text-primary);
        /* User-supplied /assets/images/app-bg.png — shown as-is, fixed on scroll.
         * The html element carries the solid base color as a backstop if the image is missing. */
        background: url('/assets/images/app-bg.png') center/cover no-repeat fixed;
      }
      .shell { display: flex; flex-direction: column; min-height: 100vh; }
      main { flex: 1; }
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
    // Preload the user directory so the listings table can show names instead
    // of account IDs without a per-row lookup.
    this.users.loadDirectory().catch((err) => {
      console.error('Failed to load user directory', err);
    });
  }
}
