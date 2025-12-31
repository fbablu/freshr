import { Component, computed, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FreshrService } from '../../core/services/freshr.service';
import { ApiService, AIExplanation } from '../../core/services/api.service';
import { Measurement, IncidentAlert } from '../../core/models/types';

type Tab = 'summary' | 'signals' | 'replay' | 'ai';

interface TabConfig {
  id: Tab;
  label: string;
  icon: string;
}

interface ReplayEvent {
  timestamp: string;
  type: 'measurement' | 'anomaly' | 'action';
  label: string;
  value?: string;
  severity?: string;
}

@Component({
  selector: 'app-zone-detail-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './zone-detail-panel.component.html',
  styles: [``],
})
export class ZoneDetailPanelComponent {
  service = inject(FreshrService);
  api = inject(ApiService);

  // Inputs
  zoneId = signal<string | null>(null);

  // Outputs
  @Output() close = new EventEmitter<void>();

  // State
  activeTab = signal<Tab>('summary');
  aiExplanation = signal<AIExplanation | null>(null);
  aiLoading = signal(false);
  aiError = signal<string | null>(null);
  aiSource = signal<'gemini' | 'fallback'>('fallback');

  tabs: TabConfig[] = [
    { id: 'summary', label: 'Summary', icon: 'info' },
    { id: 'signals', label: 'Signals', icon: 'show_chart' },
    { id: 'replay', label: 'Replay', icon: 'play_arrow' },
    { id: 'ai', label: 'AI', icon: 'auto_awesome' },
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

  // Replay events
  replayEvents = computed((): ReplayEvent[] => {
    const incidents = this.zoneIncidents();
    const measurements = this.zoneMeasurements();
    const events: ReplayEvent[] = [];

    // Add anomaly events
    incidents.forEach((inc) => {
      events.push({
        timestamp: inc.anomaly.timestamp,
        type: 'anomaly',
        label: `${this.formatSensorType(inc.anomaly.sensor_type)} anomaly detected`,
        severity: inc.anomaly.severity,
      });
    });

    // Add measurement events
    measurements.slice(0, 5).forEach((m) => {
      events.push({
        timestamp: m.timestamp,
        type: 'measurement',
        label: `${this.formatMeasurementType(m.measurement_type)} reading`,
        value: this.formatMeasurementValue(m),
      });
    });

    // Sort by timestamp descending
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  // Methods
  setZone(zoneId: string) {
    this.zoneId.set(zoneId);
    this.activeTab.set('summary');
    this.aiExplanation.set(null);
    this.aiError.set(null);

    // Auto-load AI explanation if there are incidents
    const incidents = this.service.getZoneIncidents(zoneId)();
    if (incidents.length > 0) {
      this.loadAIExplanation();
    }
  }

  async loadAIExplanation() {
    const incidents = this.zoneIncidents();
    if (incidents.length === 0) return;

    const incident = incidents[0]; // Use first/most severe incident
    this.aiLoading.set(true);
    this.aiError.set(null);

    try {
      const response = await this.api.getCopilotExplanation({
        anomaly_id: incident.anomaly.id,
        sensor_type: incident.anomaly.sensor_type,
        measurement_value: incident.measurement.measurement_value,
        measurement_type: incident.measurement.measurement_type,
        zone_id: incident.measurement.zone_id,
        severity: incident.anomaly.severity,
        timestamp: incident.anomaly.timestamp,
      });

      this.aiExplanation.set(response.explanation);
      this.aiSource.set(response.source);
    } catch (err) {
      console.error('Failed to load AI explanation:', err);
      this.aiError.set('Failed to generate explanation. Please try again.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  formatZoneName(zoneId: string): string {
    const nameMap: Record<string, string> = {
      'zone-recv-1': 'Receiving Area',
      'zone-cold-1': 'Cold Storage',
      'zone-prep-1': 'Prep Station',
      'zone-cook-1': 'Cook Line',
      'zone-wash-1': 'Wash Station',
    };
    return nameMap[zoneId] || zoneId;
  }

  formatSensorType(type: string): string {
    const typeMap: Record<string, string> = {
      cold_storage_temperature: 'Cold Storage Temp',
      handwash_station_usage: 'Handwash Station',
      ambient_kitchen_temperature: 'Ambient Temp',
      humidity: 'Humidity',
      cook_temp: 'Cook Temp',
      ingredient_flow: 'Ingredient Flow',
    };
    return typeMap[type] || type;
  }

  formatMeasurementType(type: string): string {
    const typeMap: Record<string, string> = {
      celsius: 'Temperature',
      event: 'Event',
      flow_rate: 'Flow Rate',
      percent: 'Percentage',
    };
    return typeMap[type] || type;
  }

  formatMeasurementValue(m: Measurement): string {
    if (m.measurement_type === 'celsius') {
      return `${m.measurement_value.toFixed(1)}°C`;
    }
    if (m.measurement_type === 'event') {
      return m.measurement_value === 1 ? 'Compliant' : 'Non-compliant';
    }
    return m.measurement_value.toString();
  }

  formatTimestamp(ts: string): string {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  }
}
