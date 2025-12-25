import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronDown, Bell } from 'lucide-angular';
import { FreshrService } from './core/services/freshr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LucideAngularModule],
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

  // Computed signal for incident count
  incidentCount = computed(() => this.service.incidents().length);

  updateScenario(e: any) {
    this.service.setScenario(e.target.value);
  }

  toggleIncidentList() {
    console.log('Notification bell clicked - incidents visible on map zones');
  }
}
