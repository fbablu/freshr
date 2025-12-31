import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
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
  readonly scenarios = SCENARIOS;

  activeScenario = computed(() => this.service.activeScenario());

  selectScenario(event: Event) {
    const select = event.target as HTMLSelectElement;
    const scenario = this.scenarios.find((s) => s.id === select.value);
    if (scenario) {
      this.service.setScenario(scenario);
    }
  }
}
