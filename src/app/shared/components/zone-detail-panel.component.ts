import { Component, computed, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreshrService } from '../../core/services/freshr.service';
import { LucideAngularModule } from 'lucide-angular';
import { Measurement, Incident } from '../../core/models/types';

type Tab = 'summary' | 'signals' | 'replay' | 'ai';

interface TabConfig {
  id: Tab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-zone-detail-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="h-full bg-white flex flex-col" *ngIf="zoneId()">
      <!-- Header -->
      <div class="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">Zone Details</h3>
        <button (click)="onClose()" class="p-1 hover:bg-slate-100 rounded transition-colors">
          <lucide-icon name="x" [size]="20" class="text-slate-600"></lucide-icon>
        </button>
      </div>

      <!-- Tabs -->
      <div class="border-b border-slate-200 bg-white">
        <div class="flex">
          <button
            *ngFor="let tab of tabs"
            (click)="activeTab.set(tab.id)"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2"
            [ngClass]="{
              'border-blue-600 text-blue-600': activeTab() === tab.id,
              'border-transparent text-slate-600 hover:text-slate-900': activeTab() !== tab.id,
            }"
          >
            <div class="flex items-center justify-center gap-2">
              <lucide-icon [name]="tab.icon" [size]="16"></lucide-icon>
              <span>{{ tab.label }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Summary Tab -->
        <div *ngIf="activeTab() === 'summary'" class="space-y-6">
          <!-- Zone Name -->
          <div>
            <div class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Zone</div>
            <div class="text-xl font-semibold text-slate-900">{{ zoneName() }}</div>
          </div>

          <!-- State -->
          <div>
            <div class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">State</div>
            <div
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
              [ngClass]="getStateClass()"
            >
              <div class="w-2 h-2 rounded-full" [ngClass]="getStateDotClass()"></div>
              <span>{{ getStateLabel() }}</span>
            </div>
          </div>

          <!-- Active Incidents -->
          <div>
            <div class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Active Incidents
            </div>
            <div class="text-3xl font-bold text-slate-900">{{ activeIncidentCount() }}</div>

            <!-- Incident List -->
            <div *ngIf="activeIncidentCount() > 0" class="mt-3 space-y-2">
              <div
                *ngFor="let incident of zoneIncidents()"
                class="p-3 rounded-lg border"
                [ngClass]="{
                  'bg-red-50 border-red-200': incident.anomaly.severity === 'critical',
                  'bg-orange-50 border-orange-200': incident.anomaly.severity === 'high',
                  'bg-yellow-50 border-yellow-200': incident.anomaly.severity === 'medium',
                  'bg-blue-50 border-blue-200': incident.anomaly.severity === 'low',
                }"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-slate-900">
                      {{ formatSensorType(incident.anomaly.sensor_type) }} Alert
                    </div>
                    <div class="text-xs text-slate-600 mt-1">
                      Value: {{ incident.measurement.measurement_value.toFixed(2) }}
                      {{ incident.measurement.measurement_type }}
                    </div>
                    <div class="text-xs font-medium text-slate-700 mt-2">
                      Action: {{ incident.requiredAction }}
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                      {{ formatTimestamp(incident.anomaly.timestamp) }}
                    </div>
                  </div>
                  <div class="ml-2">
                    <span
                      class="text-xs font-medium px-2 py-1 rounded"
                      [ngClass]="{
                        'bg-red-100 text-red-800': incident.anomaly.severity === 'critical',
                        'bg-orange-100 text-orange-800': incident.anomaly.severity === 'high',
                        'bg-yellow-100 text-yellow-800': incident.anomaly.severity === 'medium',
                        'bg-blue-100 text-blue-800': incident.anomaly.severity === 'low',
                      }"
                    >
                      {{ incident.anomaly.severity }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Measurements -->
          <div>
            <div class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Recent Measurements
            </div>
            <div *ngIf="recentMeasurement(); let measurement" class="space-y-2">
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div class="text-sm font-medium text-slate-900">
                    {{ formatMeasurementType(measurement.measurement_type) }}
                  </div>
                  <div class="text-xs text-slate-600 mt-1">
                    {{ formatTimestamp(measurement.timestamp) }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-lg font-semibold text-slate-900">
                    {{ formatMeasurementValue(measurement) }}
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="!recentMeasurement()" class="text-sm text-slate-500">
              No recent measurements
            </div>
          </div>
        </div>

        <!-- Signals Tab -->
        <div *ngIf="activeTab() === 'signals'" class="space-y-4">
          <div class="text-sm text-slate-600 mb-4">Historical sensor data for this zone</div>

          <div *ngFor="let measurement of zoneMeasurements()" class="p-3 bg-slate-50 rounded-lg">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="text-sm font-medium text-slate-900">
                  {{ formatMeasurementType(measurement.measurement_type) }}
                </div>
                <div class="text-xs text-slate-600 mt-1">Sensor: {{ measurement.sensor_id }}</div>
                <div class="text-xs text-slate-500 mt-1">
                  {{ formatTimestamp(measurement.timestamp) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-lg font-semibold text-slate-900">
                  {{ formatMeasurementValue(measurement) }}
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="zoneMeasurements().length === 0" class="text-center py-8 text-slate-500">
            No historical data available
          </div>
        </div>

        <!-- Replay Tab -->
        <div *ngIf="activeTab() === 'replay'" class="space-y-4">
          <div class="text-sm text-slate-600 mb-4">
            Time-based replay of incidents and measurements
          </div>

          <div class="text-center py-12 text-slate-500">
            <lucide-icon
              name="play-circle"
              [size]="48"
              class="mx-auto mb-3 text-slate-400"
            ></lucide-icon>
            <p>Replay functionality coming soon</p>
          </div>
        </div>

        <!-- AI Explanation Tab -->
        <div *ngIf="activeTab() === 'ai'" class="space-y-4">
          <div class="text-sm text-slate-600 mb-4">AI-powered insights and recommendations</div>

          <div class="text-center py-12 text-slate-500">
            <lucide-icon
              name="sparkles"
              [size]="48"
              class="mx-auto mb-3 text-slate-400"
            ></lucide-icon>
            <p>AI explanation functionality coming soon</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div *ngIf="!zoneId()" class="h-full flex items-center justify-center text-slate-500">
      <div class="text-center">
        <lucide-icon name="map-pin" [size]="48" class="mx-auto mb-3 text-slate-300"></lucide-icon>
        <p>Select a zone to view details</p>
      </div>
    </div>
  `,
  styles: [``],
})
export class ZoneDetailPanelComponent {
  service = inject(FreshrService);

  // Inputs
  zoneId = signal<string | null>(null);

  // Outputs
  @Output() close = new EventEmitter<void>();

  // State
  activeTab = signal<Tab>('summary');

  tabs: TabConfig[] = [
    { id: 'summary', label: 'Summary', icon: 'info' },
    { id: 'signals', label: 'Signals', icon: 'activity' },
    { id: 'replay', label: 'Replay', icon: 'play' },
    { id: 'ai', label: 'AI Explanation', icon: 'sparkles' },
  ];

  // Computed values
  zoneState = computed(() => {
    const id = this.zoneId();
    return id ? this.service.getZoneState(id) : 'normal';
  });

  zoneName = computed(() => {
    const id = this.zoneId();
    if (!id) return '';
    return this.formatZoneName(id);
  });

  zoneIncidents = computed(() => {
    const id = this.zoneId();
    return id ? this.service.getZoneIncidents(id)() : [];
  });

  activeIncidentCount = computed(() => {
    return this.zoneIncidents().filter((inc) => inc.status !== 'Resolved').length;
  });

  zoneMeasurements = computed(() => {
    const id = this.zoneId();
    return id ? this.service.getZoneMeasurements(id)() : [];
  });

  recentMeasurement = computed(() => {
    const id = this.zoneId();
    return id ? this.service.getZoneRecentMeasurement(id)() : null;
  });

  // Methods
  setZone(zoneId: string | null) {
    this.zoneId.set(zoneId);
  }

  onClose() {
    this.close.emit();
    this.zoneId.set(null);
  }

  getStateClass(): string {
    const state = this.zoneState();
    switch (state) {
      case 'unsafe':
        return 'bg-red-100 text-red-800';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'recovering':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  }

  getStateDotClass(): string {
    const state = this.zoneState();
    switch (state) {
      case 'unsafe':
        return 'bg-red-500';
      case 'at-risk':
        return 'bg-yellow-500';
      case 'recovering':
        return 'bg-blue-500';
      default:
        return 'bg-green-500';
    }
  }

  getStateLabel(): string {
    return this.zoneState();
  }

  formatZoneName(zoneId: string): string {
    const nameMap: Record<string, string> = {
      'zone-recv-1': 'Receiving',
      'zone-cold-1': 'Cold Storage',
      'zone-prep-1': 'Prep Station',
      'zone-cook-1': 'Cook Line',
      'zone-plate-1': 'Plating',
      'zone-wash-1': 'Washing',
    };

    return nameMap[zoneId] || zoneId.replace(/-/g, ' ').replace(/zone/i, '').trim();
  }

  formatMeasurementType(type: string): string {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatSensorType(type: string): string {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatMeasurementValue(measurement: Measurement): string {
    const value = measurement.measurement_value?.toFixed(2) || 'N/A';
    const unit = this.getUnit(measurement.measurement_type);
    return `${value}${unit}`;
  }

  private getUnit(type: string): string {
    const units: Record<string, string> = {
      celsius: '°C',
      fahrenheit: '°F',
      temperature: '°C',
      humidity: '%',
      contact: '',
      event: '',
      flow_rate: ' L/min',
    };
    return units[type] || '';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}
