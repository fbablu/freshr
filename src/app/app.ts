import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronDown, Bell } from 'lucide-angular';
import { FreshrService } from './core/services/freshr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LucideAngularModule],
  template: `
    <div
      class="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900"
    >
      <!-- Top Bar -->
      <header
        class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm"
      >
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg"
            >
              F
            </div>
            <span class="font-bold text-xl tracking-tight text-slate-800">Freshr</span>
          </div>

          <!-- Store Selector -->
          <div
            class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
          >
            <span class="text-sm font-medium text-slate-700">Downtown Kitchen #402</span>
            <lucide-icon name="chevron-down" [size]="16" class="text-slate-500"></lucide-icon>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <!-- Connection Status -->
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span class="text-xs font-semibold text-green-700 uppercase tracking-wider"
              >Connected</span
            >
          </div>

          <!-- Scenario Toggle (Demo Mode) -->
          <div class="flex items-center gap-2 border-l border-r border-slate-200 px-6">
            <span class="text-xs font-bold text-slate-400 uppercase">Sim:</span>
            <select
              (change)="updateScenario($event)"
              class="text-sm border-none bg-transparent font-medium text-slate-700 focus:ring-0 cursor-pointer"
            >
              <option value="normal">🟢 Normal Operations</option>
              <option value="drift">📈 Temp Drift</option>
              <option value="hygiene">🧼 Hygiene Failure</option>
              <option value="contamination">⚠️ Cross Contamination</option>
              <option value="recovery">⚪ Recovery</option>
            </select>
          </div>

          <!-- Notification Bell -->
          <button
            class="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            [class.bg-amber-50]="incidentCount() > 0"
            (click)="toggleIncidentList()"
          >
            <lucide-icon
              name="bell"
              [size]="20"
              [class.text-amber-600]="incidentCount() > 0"
              [class.text-slate-600]="incidentCount() === 0"
            ></lucide-icon>
            <span
              *ngIf="incidentCount() > 0"
              class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
            >
              {{ incidentCount() }}
            </span>
          </button>

          <div class="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-hidden">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
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
  incidentCount = this.service.incidents;

  updateScenario(e: any) {
    this.service.setScenario(e.target.value);
  }

  toggleIncidentList() {
    // Optional: Add logic to show incident list overlay if needed
    // For now, incidents are shown on the kitchen map zones
    console.log('Notification bell clicked - incidents visible on map zones');
  }
}
