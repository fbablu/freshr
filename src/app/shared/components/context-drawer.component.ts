import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreshrService } from '../../core/services/freshr.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

type Tab = 'summary' | 'signals' | 'replay' | 'ai';

interface AIExplanation {
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string;
  confirmRecovery: string;
}

@Component({
  selector: 'app-context-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="w-[500px] h-full bg-white border-l border-gray-200 flex flex-col" *ngIf="context()">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 class="font-semibold text-gray-900">
          {{ getTitle() }}
        </h3>
        <button (click)="close()" class="p-1 hover:bg-gray-200 rounded transition-colors">
          <lucide-icon name="x" [size]="20" class="text-gray-600"></lucide-icon>
        </button>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 bg-white">
        <div class="flex">
          <button
            *ngFor="let tab of tabs"
            (click)="activeTab.set(tab.id)"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2"
            [ngClass]="{
              'border-blue-600 text-blue-600': activeTab() === tab.id,
              'border-transparent text-gray-600 hover:text-gray-900': activeTab() !== tab.id,
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
      <div class="flex-1 overflow-y-auto">
        <!-- Summary Tab -->
        <div *ngIf="activeTab() === 'summary' && isIncident()" class="p-6 space-y-6">
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >Severity</label
            >
            <div class="mt-2">
              <span
                class="inline-block px-3 py-1 rounded-md text-sm font-semibold uppercase"
                [ngClass]="getSeverityClasses(getIncident().anomaly.severity)"
              >
                {{ getIncident().anomaly.severity }}
              </span>
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</label>
            <p class="mt-2 text-gray-900">{{ getZoneName(getIncident().anomaly.zone_id) }}</p>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >Sensor Type</label
            >
            <p class="mt-2 text-gray-900">
              {{ formatSensorType(getIncident().anomaly.sensor_type) }}
            </p>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >Anomaly Score</label
            >
            <div class="mt-2 flex items-center gap-3">
              <div class="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  class="bg-red-600 h-2 rounded-full"
                  [style.width.%]="getIncident().anomaly.score * 100"
                ></div>
              </div>
              <span class="text-sm font-medium text-gray-900">
                {{ (getIncident().anomaly.score * 100).toFixed(0) }}%
              </span>
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >Opened At</label
            >
            <p class="mt-2 text-gray-900">{{ formatTimestamp(getIncident().anomaly.timestamp) }}</p>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >Status</label
            >
            <p class="mt-2">
              <span
                class="inline-block px-3 py-1 rounded-md text-sm font-medium"
                [ngClass]="getStatusClasses(getIncident().status)"
              >
                {{ getIncident().status }}
              </span>
            </p>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >Required Action</label
            >
            <p class="mt-2 text-gray-900 font-medium">{{ getIncident().requiredAction }}</p>
          </div>
        </div>

        <!-- Zone Summary -->
        <div *ngIf="activeTab() === 'summary' && isZone()" class="p-6 space-y-6">
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</label>
            <p class="mt-2 text-gray-900 text-lg font-medium">{{ getZone().data.name }}</p>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">State</label>
            <p class="mt-2">
              <span
                class="inline-block px-3 py-1 rounded-md text-sm font-medium"
                [ngClass]="getZoneStateClasses(getZone().data.state)"
              >
                {{ getZone().data.state }}
              </span>
            </p>
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >Active Incidents</label
            >
            <p class="mt-2 text-gray-900 text-2xl font-semibold">
              {{ getZone().data.activeCount }}
            </p>
          </div>
        </div>

        <!-- Signals Tab -->
        <div *ngIf="activeTab() === 'signals' && isIncident()" class="p-6 space-y-6">
          <div>
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Anomaly Detection</h4>
            <div class="bg-red-50 rounded-lg p-4 border border-red-200">
              <div class="flex items-start gap-3">
                <lucide-icon
                  name="alert-triangle"
                  [size]="20"
                  class="text-red-600 mt-0.5"
                ></lucide-icon>
                <div class="flex-1">
                  <div class="text-sm font-medium text-red-900">
                    {{ formatSensorType(getIncident().anomaly.sensor_type) }}
                  </div>
                  <div class="text-xs text-red-700 mt-1">
                    Score: {{ (getIncident().anomaly.score * 100).toFixed(1) }}% •
                    {{ getIncident().anomaly.severity }} severity
                  </div>
                  <div class="text-xs text-red-600 mt-2">
                    {{ formatTimestamp(getIncident().anomaly.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Linked Measurement</h4>
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600">Value</span>
                <span class="text-lg font-semibold text-gray-900">
                  {{ getIncident().measurement.measurement_value
                  }}{{ getIncident().measurement.measurement_type === 'celsius' ? '°C' : '' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>Sensor ID: {{ getIncident().measurement.sensor_id }}</span>
                <span>{{ formatTimestamp(getIncident().measurement.timestamp) }}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Current Reading</h4>
            <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div class="flex items-start gap-3">
                <lucide-icon
                  name="trending-up"
                  [size]="20"
                  class="text-blue-600 mt-0.5"
                ></lucide-icon>
                <div class="flex-1">
                  <div class="text-sm font-medium text-blue-900">Live monitoring active</div>
                  <div class="text-xs text-blue-700 mt-1">
                    Continuous tracking of {{ getIncident().anomaly.sensor_id }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Replay Tab -->
        <div *ngIf="activeTab() === 'replay' && isIncident()" class="p-6 space-y-6">
          <div>
            <label class="text-sm font-semibold text-gray-900 mb-3 block">Timeline Scrubber</label>
            <input
              type="range"
              min="0"
              [max]="replayEvents().length - 1"
              [(ngModel)]="replayPosition"
              class="w-full"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>Start</span>
              <span>Event {{ replayPosition() + 1 }} of {{ replayEvents().length }}</span>
              <span>Now</span>
            </div>
          </div>

          <div class="space-y-3">
            <div
              *ngFor="let event of replayEvents(); let i = index"
              class="flex items-start gap-3 p-3 rounded-lg transition-all"
              [ngClass]="{
                'bg-blue-50 border-2 border-blue-500': i === replayPosition(),
                'bg-gray-50 opacity-60': i < replayPosition(),
                'bg-white opacity-40': i > replayPosition(),
              }"
            >
              <div
                class="p-2 rounded-lg"
                [ngClass]="{
                  'bg-blue-100': i === replayPosition(),
                  'bg-gray-100': i !== replayPosition(),
                }"
              >
                <lucide-icon
                  [name]="event.icon"
                  [size]="16"
                  [ngClass]="{
                    'text-blue-600': i === replayPosition(),
                    'text-gray-600': i !== replayPosition(),
                  }"
                ></lucide-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div
                  class="text-sm font-medium"
                  [ngClass]="{
                    'text-blue-900': i === replayPosition(),
                    'text-gray-900': i !== replayPosition(),
                  }"
                >
                  {{ event.label }}
                </div>
                <div
                  class="text-xs mt-1"
                  [ngClass]="{
                    'text-blue-700': i === replayPosition(),
                    'text-gray-500': i !== replayPosition(),
                  }"
                >
                  {{ formatTimestamp(event.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Explanation Tab -->
        <div *ngIf="activeTab() === 'ai' && isIncident()" class="p-6 space-y-6">
          <div class="flex justify-end">
            <button
              (click)="regenerateExplanation()"
              class="px-3 py-1.5 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Regenerate
            </button>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <lucide-icon name="info" [size]="16" class="text-blue-700"></lucide-icon>
              </div>
              <h4 class="text-sm font-semibold text-gray-900">What Happened</h4>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed">
              {{ currentExplanation().whatHappened }}
            </p>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <lucide-icon name="alert-triangle" [size]="16" class="text-red-700"></lucide-icon>
              </div>
              <h4 class="text-sm font-semibold text-gray-900">Why It Matters</h4>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed">
              {{ currentExplanation().whyItMatters }}
            </p>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <lucide-icon name="check-circle-2" [size]="16" class="text-amber-700"></lucide-icon>
              </div>
              <h4 class="text-sm font-semibold text-gray-900">What To Do Next</h4>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed">{{ currentExplanation().whatToDo }}</p>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <lucide-icon name="trending-up" [size]="16" class="text-green-700"></lucide-icon>
              </div>
              <h4 class="text-sm font-semibold text-gray-900">What Confirms Recovery</h4>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed">
              {{ currentExplanation().confirmRecovery }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ContextDrawerComponent {
  service = inject(FreshrService);
  context = this.service.selectedContext;
  activeTab = signal<Tab>('summary');
  replayPosition = signal(0);
  explanationVariant = signal(0);

  tabs = [
    { id: 'summary' as Tab, label: 'Summary', icon: 'info' },
    { id: 'signals' as Tab, label: 'Signals', icon: 'activity' },
    { id: 'replay' as Tab, label: 'Replay', icon: 'play' },
    { id: 'ai' as Tab, label: 'AI Explanation', icon: 'brain' },
  ];

  aiExplanations = computed(() => this.getAIExplanations());
  currentExplanation = computed(() => {
    const explanations = this.aiExplanations();
    const variant = this.explanationVariant();
    return explanations[variant % explanations.length];
  });

  replayEvents = computed(() => {
    if (!this.isIncident()) return [];

    const incident = this.getIncident();
    const events = [];
    const anomalyTime = new Date(incident.anomaly.timestamp);

    // Historical measurements
    for (let i = 5; i >= 1; i--) {
      events.push({
        type: 'measurement',
        timestamp: new Date(anomalyTime.getTime() - i * 60000).toISOString(),
        label: `Measurement: ${(incident.measurement.measurement_value - i * 0.5).toFixed(1)}${
          incident.measurement.measurement_type === 'celsius' ? '°C' : ''
        }`,
        icon: 'activity',
      });
    }

    events.push({
      type: 'anomaly',
      timestamp: incident.anomaly.timestamp,
      label: `Anomaly Detected (${incident.anomaly.severity})`,
      icon: 'alert-triangle',
    });

    events.push({
      type: 'incident',
      timestamp: new Date(anomalyTime.getTime() + 10000).toISOString(),
      label: 'Incident Created',
      icon: 'info',
    });

    if (incident.status === 'Acknowledged' || incident.status === 'Resolved') {
      events.push({
        type: 'acknowledged',
        timestamp: new Date(anomalyTime.getTime() + 60000).toISOString(),
        label: 'Operator Acknowledged',
        icon: 'check-circle-2',
      });
    }

    if (incident.status === 'Resolved') {
      events.push({
        type: 'resolved',
        timestamp: new Date(anomalyTime.getTime() + 120000).toISOString(),
        label: 'Action Taken - Resolved',
        icon: 'check-circle-2',
      });
    }

    return events;
  });

  close() {
    this.service.selectedContext.set(null);
  }

  regenerateExplanation() {
    this.explanationVariant.update((v) => v + 1);
  }

  getTitle(): string {
    const ctx = this.context();
    if (!ctx) return 'Context';
    if (ctx.type === 'incident') return 'Incident Details';
    if (ctx.type === 'zone') return 'Zone Details';
    return 'Context';
  }

  isIncident(): boolean {
    return this.context()?.type === 'incident';
  }

  isZone(): boolean {
    return this.context()?.type === 'zone';
  }

  getIncident(): any {
    return this.context()?.data;
  }

  getZone(): any {
    return this.context();
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

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  getSeverityClasses(severity: string): string {
    const classes: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-amber-100 text-amber-800',
      low: 'bg-yellow-100 text-yellow-800',
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

  getZoneStateClasses(state: string): string {
    const classes: Record<string, string> = {
      normal: 'bg-green-50 text-green-700',
      'at-risk': 'bg-amber-50 text-amber-700',
      unsafe: 'bg-red-50 text-red-700',
      recovering: 'bg-blue-50 text-blue-700',
    };
    return classes[state] || classes['normal'];
  }

  private getAIExplanations(): AIExplanation[] {
    if (!this.isIncident()) return [this.getDefaultExplanation()];

    const incident = this.getIncident();
    const sensorType = incident.anomaly.sensor_type;

    if (sensorType === 'cold_storage_temperature') {
      return [
        {
          whatHappened: `Cold storage temperature exceeded safe threshold at ${incident.measurement.measurement_value}°C. Sensors detected sustained temperature rise over ${Math.floor(Math.random() * 10 + 5)} minutes, indicating possible equipment failure or door left open.`,
          whyItMatters:
            'Temperature abuse can accelerate bacterial growth in stored proteins, dairy, and produce. Extended exposure above 4°C puts products at risk of spoilage and creates potential for foodborne illness if served.',
          whatToDo:
            'HOLD all products in affected zone. Verify internal product temps with calibrated thermometer. Transfer products to backup cold storage. Service refrigeration unit immediately. Document all temps and actions taken.',
          confirmRecovery:
            'Cold storage returns to 2-4°C for 30+ minutes. All products checked and logged. Equipment serviced and functioning. Operator signs off on corrective action.',
        },
        {
          whatHappened: `Temperature anomaly detected in cold storage unit. Reading of ${incident.measurement.measurement_value}°C exceeds FDA guidelines for refrigerated storage (≤4°C). Pattern suggests gradual drift rather than sudden failure.`,
          whyItMatters:
            'Even brief temperature excursions compromise food safety. HACCP critical control point violated. Products may need disposal depending on time-temperature history. Regulatory reporting may be required for sustained violations.',
          whatToDo:
            'Immediately assess all stored products. Check door seals and condenser coils. Review recent door access logs. Move high-risk items (dairy, prepared foods) to compliant storage. Call service technician for diagnostic.',
          confirmRecovery:
            'Stable temps at 2-3°C for 1+ hour. Root cause identified and corrected. All affected products evaluated and documented. HACCP logs updated with corrective actions.',
        },
      ];
    }

    if (sensorType.includes('handwash') || sensorType.includes('sanitization')) {
      return [
        {
          whatHappened: `Hygiene compliance dropped below acceptable threshold. Only ${incident.measurement.measurement_value} handwash events detected in last hour vs. expected 10-15 for current shift activity level.`,
          whyItMatters:
            'Handwashing is the single most effective prevention against cross-contamination. Low compliance creates direct risk for pathogen transfer from raw to ready-to-eat foods. One missed handwash can contaminate an entire service.',
          whatToDo:
            'IMMEDIATE RETRAIN: Gather all prep staff for 5-minute hygiene review. Re-emphasize critical handwash moments (after handling raw proteins, before ready-to-eat work, after touching face/hair). Assign spotter for next 2 hours. Document retraining.',
          confirmRecovery:
            'Handwash compliance returns to 10+ events/hour. All staff demonstrate proper technique. No cross-contamination detected. Manager verifies understanding of protocols.',
        },
      ];
    }

    if (sensorType.includes('cross_contact') || sensorType.includes('contamination')) {
      return [
        {
          whatHappened: `Cross-contact sensors detected potential contamination event. Raw protein surfaces came in contact with ready-to-eat prep area. Alert triggered by proximity sensors and workflow pattern analysis.`,
          whyItMatters:
            'Cross-contamination is the leading cause of foodborne illness in commercial kitchens. Even trace amounts of raw protein bacteria on ready-to-eat foods can cause serious illness. Zero tolerance for cross-contact.',
          whatToDo:
            'STOP PRODUCTION: Discard all ready-to-eat items prepared in last 15 minutes. Deep sanitize affected work surfaces and utensils. Retrain staff on color-coded cutting boards and dedicated utensils. Resume only after verification.',
          confirmRecovery:
            'Affected products discarded and logged. All surfaces deep-sanitized. Staff retrained on cross-contact prevention. Workflow modified to prevent recurrence. Manager approval to resume.',
        },
      ];
    }

    return [this.getDefaultExplanation()];
  }

  private getDefaultExplanation(): AIExplanation {
    return {
      whatHappened: `Anomaly detected in monitoring system. Sensor reading exceeded operational parameters.`,
      whyItMatters:
        'Food safety monitoring systems flag conditions that create risk for contamination or temperature abuse. Rapid response prevents minor issues from becoming major food safety incidents.',
      whatToDo:
        'Investigate sensor alert immediately. Verify conditions with secondary measurement. Take corrective action per HACCP plan. Document findings and actions in shift log.',
      confirmRecovery:
        'Conditions return to normal range. Root cause identified. Corrective actions completed and documented. Monitoring continues.',
    };
  }
}
