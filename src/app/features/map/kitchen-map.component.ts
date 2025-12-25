import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreshrService } from '../../core/services/freshr.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-kitchen-map',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="p-8 h-full bg-slate-50 flex flex-col items-center justify-center">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-slate-800 tracking-tight">Kitchen Overview</h1>
        <p class="text-slate-500">Live zone status monitoring</p>
      </div>

      <div class="grid grid-cols-3 gap-6 w-full max-w-5xl aspect-video">
        <!-- Zone Tiles -->
        <ng-container *ngFor="let zone of zones() | keyvalue">
          <div
            (click)="selectZone(zone.key, zone.value)"
            class="relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden shadow-sm"
            [ngClass]="{
              'bg-white border-slate-200 hover:border-blue-300': zone.value.state === 'normal',
              'bg-red-50 border-red-200 hover:border-red-400': zone.value.state === 'unsafe',
              'bg-yellow-50 border-yellow-200 hover:border-yellow-400':
                zone.value.state === 'at-risk',
              'bg-blue-50 border-blue-200 hover:border-blue-400': zone.value.state === 'recovering',
            }"
          >
            <!-- Status Badge -->
            <div class="absolute top-4 right-4 animate-pulse" *ngIf="zone.value.state !== 'normal'">
              <span
                class="w-3 h-3 rounded-full inline-block"
                [ngClass]="{
                  'bg-red-500': zone.value.state === 'unsafe',
                  'bg-yellow-500': zone.value.state === 'at-risk',
                }"
              ></span>
            </div>

            <div>
              <h3 class="text-lg font-bold text-slate-800">{{ zone.value.name }}</h3>
              <p
                class="text-sm font-medium uppercase tracking-wider mt-1"
                [ngClass]="{
                  'text-green-600': zone.value.state === 'normal',
                  'text-red-600': zone.value.state === 'unsafe',
                  'text-yellow-600': zone.value.state === 'at-risk',
                }"
              >
                {{ zone.value.state }}
              </p>
            </div>

            <div class="mt-4">
              <div class="text-4xl font-light text-slate-800">{{ zone.value.activeCount }}</div>
              <div class="text-xs text-slate-500">Active Issues</div>
            </div>

            <!-- Decoration -->
            <div
              class="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10"
              [ngClass]="{
                'bg-green-500': zone.value.state === 'normal',
                'bg-red-500': zone.value.state === 'unsafe',
                'bg-yellow-500': zone.value.state === 'at-risk',
              }"
            ></div>
          </div>
        </ng-container>
      </div>

      <div class="mt-8 flex gap-6 text-sm text-slate-500">
        <span class="flex items-center gap-2"
          ><span class="w-2 h-2 rounded-full bg-green-500"></span> Normal</span
        >
        <span class="flex items-center gap-2"
          ><span class="w-2 h-2 rounded-full bg-yellow-500"></span> At Risk</span
        >
        <span class="flex items-center gap-2"
          ><span class="w-2 h-2 rounded-full bg-red-500"></span> Unsafe</span
        >
      </div>
    </div>
  `,
})
export class KitchenMapComponent {
  service = inject(FreshrService);

  // Expose signal directly
  zones = this.service.zoneStates;

  selectZone(id: string, zoneData: any) {
    (this.service as any).selectedContext.set({ type: 'zone', id: id, data: zoneData });
  }
}
