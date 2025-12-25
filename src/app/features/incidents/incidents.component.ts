import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreshrService } from '../../core/services/freshr.service';
import {
  LucideAngularModule,
  AlertCircle,
  CheckCircle,
  Clock,
  Thermometer,
  Box,
} from 'lucide-angular';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="p-6 h-full overflow-y-auto bg-slate-50">
      <header class="mb-6 flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Incident Inbox</h1>
          <p class="text-slate-500">Real-time detected anomalies requiring attention</p>
        </div>
        <div class="flex gap-2">
          <span class="px-3 py-1 bg-white border rounded text-sm text-slate-600">Filter: All</span>
          <span class="px-3 py-1 bg-white border rounded text-sm text-slate-600"
            >Sort: Severity</span
          >
        </div>
      </header>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Severity</th>
              <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                Zone & Sensor
              </th>
              <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Issue</th>
              <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                Required Action
              </th>
              <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              *ngFor="let inc of service.incidents()"
              (click)="selectIncident(inc)"
              class="hover:bg-blue-50/50 cursor-pointer transition-colors group"
            >
              <!-- Severity -->
              <td class="px-6 py-4">
                <span
                  [ngClass]="{
                    'bg-red-100 text-red-700 border-red-200': inc.anomaly.severity === 'critical',
                    'bg-orange-100 text-orange-700 border-orange-200':
                      inc.anomaly.severity === 'high',
                    'bg-yellow-100 text-yellow-700 border-yellow-200':
                      inc.anomaly.severity === 'medium',
                    'bg-slate-100 text-slate-600 border-slate-200': inc.anomaly.severity === 'low',
                  }"
                  class="px-2 py-1 rounded-full text-xs font-medium border uppercase flex items-center w-fit gap-1"
                >
                  {{ inc.anomaly.severity }}
                </span>
              </td>

              <!-- Location -->
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">{{ inc.zone_name }}</div>
                <div class="text-xs text-slate-500 flex items-center gap-1">
                  <lucide-icon name="box" [size]="12"></lucide-icon> {{ inc.anomaly.sensor_id }}
                </div>
              </td>

              <!-- Issue -->
              <td class="px-6 py-4">
                <div class="text-slate-800">{{ formatSensorType(inc.anomaly.sensor_type) }}</div>
                <div class="text-xs text-slate-500">
                  Score: {{ (inc.anomaly.score * 100).toFixed(0) }}%
                </div>
              </td>

              <!-- Action -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  {{ inc.requiredAction }}
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <span
                  [ngClass]="{
                    'text-green-600 bg-green-50': inc.status === 'Resolved',
                    'text-blue-600 bg-blue-50': inc.status === 'Acknowledged',
                    'text-slate-600 bg-slate-100': inc.status === 'Open',
                  }"
                  class="px-2 py-0.5 rounded text-xs font-semibold"
                >
                  {{ inc.status }}
                </span>
              </td>

              <!-- Row Actions -->
              <td class="px-6 py-4" (click)="$event.stopPropagation()">
                <div class="flex gap-2">
                  <button
                    *ngIf="inc.status === 'Open'"
                    (click)="service.acknowledgeIncident(inc.anomaly.id)"
                    class="text-xs px-2 py-1 border rounded hover:bg-slate-50"
                  >
                    Ack
                  </button>
                  <button
                    *ngIf="inc.status !== 'Resolved'"
                    (click)="service.resolveIncident(inc.anomaly.id)"
                    class="text-xs px-2 py-1 border rounded bg-slate-800 text-white hover:bg-slate-700"
                  >
                    Resolve
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="service.incidents().length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                <h3 class="text-lg">No Active Incidents</h3>
                <p class="text-sm">Everything is running smoothly.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class IncidentsComponent {
  service = inject(FreshrService);

  selectIncident(inc: any) {
    // TODO: Communicate with drawer (via Service or Route)
    // For now, assume service handles it or we pass it up.
    // In this specific task, I'll attach a signal to the service for "selectedContext".
    // I need to add that to the service.
    (this.service as any).selectedContext.set({ type: 'incident', data: inc });
  }

  formatSensorType(t: string) {
    return t
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
