import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreshrService } from '../../core/services/freshr.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-kitchen-map',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 bg-white">
        <h2 class="text-2xl font-semibold text-gray-900">Kitchen Map</h2>
        <p class="text-sm text-gray-600 mt-1">Real-time zone monitoring</p>
      </div>

      <!-- Map Grid -->
      <div class="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div class="max-w-6xl mx-auto">
          <div
            class="grid gap-4"
            style="
              grid-template-areas:
                'recv recv cold cold'
                'prep prep cook cook'
                'prep prep plate plate'
                'wash wash plate plate';
              grid-template-columns: repeat(4, 1fr);
              grid-template-rows: repeat(4, 180px);
            "
          >
            <!-- Zone Cards -->
            <div
              *ngFor="let zone of zones() | keyvalue"
              (click)="selectZone(zone.key, zone.value)"
              class="rounded-xl border-2 p-6 cursor-pointer transition-all"
              [style.grid-area]="getGridArea(zone.key)"
              [ngClass]="{
                'bg-green-50 border-green-300 hover:shadow-lg':
                  zone.value.state === 'normal' && !isSelected(zone.key),
                'bg-amber-50 border-amber-300 hover:shadow-lg':
                  zone.value.state === 'at-risk' && !isSelected(zone.key),
                'bg-red-50 border-red-300 hover:shadow-lg':
                  zone.value.state === 'unsafe' && !isSelected(zone.key),
                'bg-blue-50 border-blue-300 hover:shadow-lg':
                  zone.value.state === 'recovering' && !isSelected(zone.key),
                'border-blue-500 shadow-xl scale-[1.02]': isSelected(zone.key),
              }"
            >
              <div class="flex flex-col h-full">
                <!-- Header with Status Dot -->
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">{{ zone.value.name }}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">{{ zone.key }}</p>
                  </div>
                  <div
                    class="w-4 h-4 rounded-full shadow-lg"
                    [ngClass]="{
                      'bg-green-500': zone.value.state === 'normal',
                      'bg-amber-500': zone.value.state === 'at-risk',
                      'bg-red-500': zone.value.state === 'unsafe',
                      'bg-blue-500': zone.value.state === 'recovering',
                    }"
                  ></div>
                </div>

                <!-- Status Label and Incident Count -->
                <div class="flex-1 flex flex-col justify-end">
                  <div
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm"
                    [ngClass]="{
                      'text-green-700': zone.value.state === 'normal',
                      'text-amber-700': zone.value.state === 'at-risk',
                      'text-red-700': zone.value.state === 'unsafe',
                      'text-blue-700': zone.value.state === 'recovering',
                    }"
                  >
                    <span>{{ getStateLabel(zone.value.state) }}</span>
                  </div>

                  <div
                    *ngIf="zone.value.activeCount > 0"
                    class="mt-3 pt-3 border-t border-gray-200"
                  >
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-600">Active incidents</span>
                      <span
                        class="font-bold"
                        [ngClass]="{
                          'text-green-700': zone.value.state === 'normal',
                          'text-amber-700': zone.value.state === 'at-risk',
                          'text-red-700': zone.value.state === 'unsafe',
                          'text-blue-700': zone.value.state === 'recovering',
                        }"
                      >
                        {{ zone.value.activeCount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div class="mt-6 bg-white rounded-lg border border-gray-200 p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Legend</span>
              <div class="flex items-center gap-6">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                  <span class="text-sm text-gray-600">Normal</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span class="text-sm text-gray-600">At Risk</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <span class="text-sm text-gray-600">Unsafe</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span class="text-sm text-gray-600">Recovering</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class KitchenMapComponent {
  service = inject(FreshrService);
  zones = this.service.zoneStates;
  selectedZoneId: string | null = null;

  selectZone(id: string, zoneData: any) {
    this.selectedZoneId = id;
    this.service.selectedContext.set({ type: 'zone', id: id, data: zoneData });
  }

  isSelected(zoneId: string): boolean {
    return this.selectedZoneId === zoneId;
  }

  getGridArea(zoneId: string): string {
    const gridAreas: Record<string, string> = {
      'zone-cold-1': 'cold',
      'zone-prep-1': 'prep',
      'zone-cook-1': 'cook',
      'zone-plate-1': 'plate',
      'zone-wash-1': 'wash',
      'zone-recv-1': 'recv',
    };
    return gridAreas[zoneId] || 'auto';
  }

  getStateLabel(state: string): string {
    const labels: Record<string, string> = {
      normal: 'Normal',
      'at-risk': 'At Risk',
      unsafe: 'Unsafe',
      recovering: 'Recovering',
    };
    return labels[state] || state;
  }
}
