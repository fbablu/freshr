import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronDown, Bell } from 'lucide-angular';
import { FreshrService } from './core/services/freshr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LucideAngularModule], // Remove .pick()
  templateUrl: './app.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class App {
  service = inject(FreshrService);

  // Make icons available for template
  readonly ChevronDown = ChevronDown;
  readonly Bell = Bell;

  incidentCount = computed(() => this.service.incidents().length);

  toggleIncidentList() {
    console.log('Notification bell clicked - incidents visible on map zones');
  }
}
