import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  LayoutDashboard,
  Map as MapIcon,
  Settings,
  Bell,
  ChevronDown,
} from 'lucide-angular';
import { ContextDrawerComponent } from './shared/components/context-drawer.component';
import { FreshrService } from './core/services/freshr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    LucideAngularModule,
    ContextDrawerComponent,
  ],
  template: `
    <div
      class="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900"
    >
      <!-- Top Bar -->
      <header
        class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm relative"
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

          <div class="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
        </div>
      </header>

      <!-- Main Layout -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <nav class="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between py-6">
          <div class="space-y-1 px-3">
            <a
              routerLink="/incidents"
              routerLinkActive="bg-slate-800 text-white shadow-inner"
              class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 transition-all group"
            >
              <lucide-icon
                name="bell"
                [size]="20"
                class="group-hover:text-white transition-colors"
              ></lucide-icon>
              <span class="font-medium">Incident Inbox</span>
              <span
                class="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                *ngIf="activeCount().length > 0"
                >{{ activeCount().length }}</span
              >
            </a>

            <a
              routerLink="/map"
              routerLinkActive="bg-slate-800 text-white shadow-inner"
              class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 transition-all group"
            >
              <lucide-icon
                name="map"
                [size]="20"
                class="group-hover:text-white transition-colors"
              ></lucide-icon>
              <span class="font-medium">Kitchen Map</span>
            </a>
          </div>

          <div class="px-6">
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              System
            </div>
            <div
              class="flex items-center gap-3 text-sm hover:text-white cursor-pointer transition-colors"
            >
              <lucide-icon name="settings" [size]="18"></lucide-icon> Settings
            </div>
          </div>
        </nav>

        <!-- Content Area -->
        <main class="flex-1 relative overflow-hidden flex">
          <div class="flex-1 h-full overflow-hidden relative z-0">
            <router-outlet></router-outlet>
          </div>

          <!-- Context Drawer -->
          <div
            class="w-[400px] h-full relative z-10 transition-transform duration-300 ease-in-out transform"
            [class.translate-x-full]="!isDrawerOpen()"
            [class.translate-x-0]="isDrawerOpen()"
            [class.hidden]="!isDrawerOpen() && !drawerVisible"
          >
            <!-- Optimization -->
            <app-context-drawer></app-context-drawer>
          </div>
        </main>
      </div>
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
  private service = inject(FreshrService);

  isDrawerOpen = this.service.selectedContext;
  drawerVisible = false; // logic to keep DOM present for animation if needed, simplified here.

  activeCount = this.service.incidents; // Actually this is a list, I need count.

  // Correction: activeCount is computed signal returning list.
  // I need derived signal for length.

  constructor() {}

  updateScenario(e: any) {
    this.service.setScenario(e.target.value);
  }
}
