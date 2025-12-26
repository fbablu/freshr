import { Component, computed, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FreshrService } from '../../core/services/freshr.service';
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
  imports: [CommonModule, MatIconModule],
  templateUrl: './zone-detail-panel.component.html',
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
    { id: 'signals', label: 'Signals', icon: 'show_chart' },
    { id: 'replay', label: 'Replay', icon: 'play_arrow' },
    { id: 'ai', label: 'AI Explanation', icon: 'auto_awesome' },
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
