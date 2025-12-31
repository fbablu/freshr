import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FreshrService } from '../../core/services/freshr.service';
import { LucideAngularModule, AlertCircle, CheckCircle2, Clock, Filter } from 'lucide-angular';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="flex flex-col h-full">
      <!-- Header with Filters -->
      <div class="p-6 border-b border-gray-200 bg-white">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-semibold text-gray-900">Incidents</h2>
            <p class="text-sm text-gray-600 mt-1">
              {{ filteredIncidents().length }} active
              {{ filteredIncidents().length === 1 ? 'incident' : 'incidents' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <lucide-icon name="filter" [size]="16" class="text-gray-500"></lucide-icon>
            <select
              [(ngModel)]="severityFilter"
              (ngModelChange)="onFilterChange()"
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              [(ngModel)]="statusFilter"
              (ngModelChange)="onFilterChange()"
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select
              [(ngModel)]="zoneFilter"
              (ngModelChange)="onFilterChange()"
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Zones</option>
              <option *ngFor="let zone of uniqueZones()" [value]="zone">
                {{ getZoneName(zone) }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Incidents List -->
      <div class="flex-1 overflow-y-auto bg-gray-50">
        <div class="p-4 space-y-2">
          <div
            *ngFor="let incident of filteredIncidents()"
            (click)="selectIncident(incident)"
            class="bg-white rounded-lg border-2 transition-all cursor-pointer"
            [ngClass]="{
              'border-blue-500 shadow-lg': selectedIncidentId() === incident.anomaly.id,
              'border-transparent hover:border-gray-200':
                selectedIncidentId() !== incident.anomaly.id,
            }"
          >
            <div class="p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 flex-1">
                  <!-- Severity Badge -->
                  <div
                    class="px-2.5 py-1 rounded-md text-xs font-semibold uppercase border"
                    [ngClass]="getSeverityClasses(incident.anomaly.severity)"
                  >
                    {{ incident.anomaly.severity }}
                  </div>

                  <!-- Incident Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium text-gray-900">
                        {{ getZoneName(incident.anomaly.zone_id) }}
                      </span>
                      <span class="text-gray-400">•</span>
                      <span class="text-sm text-gray-600">
                        {{ formatSensorType(incident.anomaly.sensor_type) }}
                      </span>
                    </div>
                    <div class="text-sm font-medium text-gray-900 mb-2">
                      {{ incident.requiredAction }}
                    </div>
                    <div class="flex items-center gap-4 text-xs text-gray-500">
                      <div class="flex items-center gap-1">
                        <lucide-icon name="clock" [size]="12"></lucide-icon>
                        {{ getAge(incident.anomaly.timestamp) }}
                      </div>
                      <div class="flex items-center gap-1">
                        <lucide-icon name="alert-circle" [size]="12"></lucide-icon>
                        Score: {{ (incident.anomaly.score * 100).toFixed(0) }}%
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Status and Actions -->
                <div class="flex items-center gap-2">
                  <div
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                    [ngClass]="getStatusClasses(incident.status)"
                  >
                    <div
                      class="w-1.5 h-1.5 rounded-full"
                      [ngClass]="getStatusDotClass(incident.status)"
                    ></div>
                    {{ incident.status }}
                  </div>

                  <button
                    *ngIf="incident.status === 'Open'"
                    (click)="acknowledgeIncident($event, incident.anomaly.id)"
                    class="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    *ngIf="incident.status === 'Acknowledged'"
                    (click)="resolveIncident($event, incident.anomaly.id)"
                    class="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors flex items-center gap-1"
                  >
                    <lucide-icon name="check-circle-2" [size]="12"></lucide-icon>
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="filteredIncidents().length === 0" class="text-center py-12">
            <lucide-icon
              name="check-circle-2"
              [size]="48"
              class="text-green-500 mx-auto mb-3"
            ></lucide-icon>
            <p class="text-gray-600 font-medium">No incidents found</p>
            <p class="text-sm text-gray-500 mt-1">All systems operating normally</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class IncidentsComponent {
  service = inject(FreshrService);

  severityFilter = signal('all');
  statusFilter = signal('all');
  zoneFilter = signal('all');
  selectedIncidentId = signal<string | null>(null);

  filteredIncidents = computed(() => {
    const incidents = this.service.incidents();
    const severity = this.severityFilter();
    const status = this.statusFilter();
    const zone = this.zoneFilter();

    return incidents.filter((incident) => {
      if (severity !== 'all' && incident.anomaly.severity !== severity) return false;
      if (status !== 'all' && incident.status !== status) return false;
      if (zone !== 'all' && incident.anomaly.zone_id !== zone) return false;
      return true;
    });
  });

  uniqueZones = computed(() => {
    const incidents = this.service.incidents();
    const zoneSet = new Set(incidents.map((i) => i.anomaly.zone_id));
    return Array.from(zoneSet);
  });

  onFilterChange() {
    // Triggers computed recomputation
  }

  selectIncident(incident: any) {
    this.selectedIncidentId.set(incident.anomaly.id);
    this.service.selectedContext.set({ type: 'incident', data: incident, id: incident.anomaly.id });
  }

  acknowledgeIncident(event: Event, id: string) {
    event.stopPropagation();
    this.service.acknowledgeIncident(id);
  }

  resolveIncident(event: Event, id: string) {
    event.stopPropagation();
    this.service.resolveIncident(id);
  }

  getZoneName(zoneId: string): string {
    const zoneNames: Record<string, string> = {
      'zone-cold-1': 'Cold Storage',
      'zone-prep-1': 'Prep Station',
      'zone-cook-1': 'Cook Line',
      'zone-plate-1': 'Plating',
      'zone-wash-1': 'Dish/Handwash',
      'zone-recv-1': 'Receiving',
    };
    return zoneNames[zoneId] || zoneId;
  }

  formatSensorType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  getAge(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '<1m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  getSeverityClasses(severity: string): string {
    const classes: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-amber-100 text-amber-800 border-amber-200',
      low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return classes[severity] || classes['low'];
  }

  getStatusClasses(status: string): string {
    const classes: Record<string, string> = {
      Open: 'bg-red-50 text-red-700',
      Acknowledged: 'bg-amber-50 text-amber-700',
      Resolved: 'bg-green-50 text-green-700',
    };
    return classes[status] || classes['Open'];
  }

  getStatusDotClass(status: string): string {
    const classes: Record<string, string> = {
      Open: 'bg-red-500',
      Acknowledged: 'bg-amber-500',
      Resolved: 'bg-green-500',
    };
    return classes[status] || classes['Open'];
  }
}
