import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NotificationHostComponent } from './shared/components/notification-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
