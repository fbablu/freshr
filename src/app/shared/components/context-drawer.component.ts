import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreshrService } from '../../core/services/freshr.service';
import { ApiService, AIExplanation } from '../../core/services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

type Tab = 'summary' | 'signals' | 'replay' | 'ai';

@Component({
  selector: 'app-context-drawer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './context-drawer.component.html',
  styles: [
    `
      @keyframes loading-bar {
        0% {
          width: 0%;
          margin-left: 0;
        }
        50% {
          width: 70%;
          margin-left: 15%;
        }
        100% {
          width: 0%;
          margin-left: 100%;
        }
      }
      .animate-loading-bar {
        animation: loading-bar 2s ease-in-out infinite;
      }
    `,
  ],
})
export class ContextDrawerComponent {
  service = inject(FreshrService);
  api = inject(ApiService);

  context = this.service.selectedContext;
  activeTab = signal<Tab>('summary');
  replayPosition = signal(0);

  // AI State
  aiExplanation = signal<AIExplanation | null>(null);
  aiLoading = signal(false);
  aiError = signal<string | null>(null);

  tabs = [
    { id: 'summary' as Tab, label: 'Summary', icon: 'info' },
    { id: 'signals' as Tab, label: 'Signals', icon: 'activity' },
    { id: 'replay' as Tab, label: 'Replay', icon: 'play' },
    { id: 'ai' as Tab, label: 'AI Explanation', icon: 'brain' },
  ];

  replayEvents = computed(() => {
    if (!this.isIncident()) return [];

    const incident = this.getIncident();
    const events = [];
    const anomalyTime = new Date(incident.anomaly.timestamp);

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

  constructor() {
    // Auto-load AI explanation when switching to AI tab with an incident
    effect(() => {
      if (
        this.activeTab() === 'ai' &&
        this.isIncident() &&
        !this.aiExplanation() &&
        !this.aiLoading()
      ) {
        this.loadAIExplanation();
      }
    });
  }

  setActiveTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  async loadAIExplanation() {
    if (!this.isIncident()) return;

    const incident = this.getIncident();
    this.aiLoading.set(true);
    this.aiError.set(null);
    this.aiExplanation.set(null);

    try {
      const response = await this.api.getCopilotExplanation({
        anomaly_id: incident.anomaly.id,
        sensor_type: incident.anomaly.sensor_type,
        measurement_value: incident.measurement?.measurement_value ?? 0,
        measurement_type: incident.measurement?.measurement_type ?? '',
        zone_id: incident.anomaly.zone_id,
        severity: incident.anomaly.severity,
        timestamp: incident.anomaly.timestamp,
      });

      this.aiExplanation.set(response.explanation);
    } catch (err: any) {
      console.error('Failed to load AI explanation:', err);
      this.aiError.set(
        err?.error?.gemini_error || 'Failed to generate explanation. Please try again.',
      );
    } finally {
      this.aiLoading.set(false);
    }
  }

  close() {
    this.service.selectedContext.set(null);
    this.aiExplanation.set(null);
    this.aiError.set(null);
  }

  onReplayChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.replayPosition.set(parseInt(input.value, 10));
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
    return this.context()?.data;
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

  currentTime = signal(new Date().toISOString());
}
