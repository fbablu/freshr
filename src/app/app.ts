import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronDown, Bell, Play } from 'lucide-angular';
import { FreshrService } from './core/services/freshr.service';
import { SCENARIOS } from './scenarios/scenarios.config';

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

  readonly ChevronDown = ChevronDown;
  readonly Bell = Bell;
  readonly Play = Play;

  readonly scenarios = SCENARIOS;

  incidentCount = computed(
    () => this.service.incidents().filter((i) => i.status !== 'Resolved').length,
  );
  activeScenario = computed(() => this.service.activeScenario());

  selectScenario(event: Event) {
    const select = event.target as HTMLSelectElement;
    const scenario = this.scenarios.find((s) => s.id === select.value);
    if (scenario) {
      this.service.setScenario(scenario);
    }
  }

  toggleIncidentList() {
    console.log('Incidents:', this.service.incidents());
  }
}
