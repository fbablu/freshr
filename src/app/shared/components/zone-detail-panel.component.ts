import {
  Component,
  computed,
  inject,
  signal,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
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
  time: number;
  type: 'measurement' | 'anomaly' | 'action';
  label: string;
  value?: string;
  severity?: string;
  sensorType?: string;
  zoneId?: string;
}

@Component({
  selector: 'app-zone-detail-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './zone-detail-panel.component.html',
  styles: [
    `
      .replay-scrubber::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .replay-scrubber::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .event-highlight {
        animation: pulse-highlight 0.5s ease-out;
      }
      @keyframes pulse-highlight {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
        }
        50% {
          transform: scale(1.02);
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
        }
      }
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
export class ZoneDetailPanelComponent implements OnDestroy {
  service = inject(FreshrService);
  api = inject(ApiService);

  // Inputs
  zoneId = signal<string | null>(null);

  // Outputs
  @Output() close = new EventEmitter<void>();

  // Local UI state
  activeTab = signal<Tab>('summary');
  aiExplanation = signal<AIExplanation | null>(null);
  aiLoading = signal(false);
  aiError = signal<string | null>(null);
  aiSource = signal<'gemini' | 'fallback'>('fallback');

  // Replay local state (playback control)
  isPlaying = signal(false);
  playbackSpeed = signal(1);
  private playbackInterval: ReturnType<typeof setInterval> | null = null;

  tabs: TabConfig[] = [
    { id: 'summary', label: 'Summary', icon: 'info' },
    { id: 'signals', label: 'Signals', icon: 'show_chart' },
    { id: 'replay', label: 'Replay', icon: 'play_arrow' },
    { id: 'ai', label: 'AI', icon: 'auto_awesome' },
  ];

  speedOptions = [0.5, 1, 2, 4];

  // ============ COMPUTED FROM SERVICE ============

  // Replay state comes from service (shared with kitchen map)
  replayMode = this.service.replayMode;
  replayTime = this.service.replayTime;

  zoneState = computed(() => {
    const id = this.zoneId();
    return id ? this.service.getZoneState(id) : 'normal';
  });

  zoneName = computed(() => {
    const id = this.zoneId();
    if (!id) return '';
    return this.formatZoneName(id);
  });

  // Use visibleIncidents for zone - respects replay time
  zoneIncidents = computed(() => {
    const id = this.zoneId();
    if (!id) return [];
    return this.service.visibleIncidents().filter((inc) => inc.anomaly.zone_id === id);
  });

  zoneMeasurements = computed(() => {
    const id = this.zoneId();
    if (!id) return [];
    return this.service.measurements().filter((m) => m.zone_id === id);
  });

  recentMeasurement = computed(() => {
    const measurements = this.zoneMeasurements();
    return measurements.length > 0 ? measurements[0] : null;
  });

  activeIncidentCount = computed(() => this.zoneIncidents().length);
  visibleIncidentCount = computed(() => this.zoneIncidents().length);

  // ============ REPLAY COMPUTED ============

  replayTimeRange = computed(() => {
    const events = this.allReplayEvents();
    if (events.length === 0) {
      return { start: 0, end: 0, duration: 0 };
    }
    const times = events.map((e) => e.time);
    const start = Math.min(...times);
    const end = Math.max(...times);
    return { start, end, duration: end - start };
  });

  scrubPercent = computed(() => {
    const current = this.replayTime();
    const range = this.replayTimeRange();
    if (current === null || range.duration === 0) return 0;
    return ((current - range.start) / range.duration) * 100;
  });

  currentEventIndex = computed(() => {
    const current = this.replayTime();
    if (current === null) return -1;
    const events = this.allReplayEvents();
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].time <= current) return i;
    }
    return -1;
  });

  allReplayEvents = computed((): ReplayEvent[] => {
    const incidents = this.service.incidents();
    const events: ReplayEvent[] = [];

    incidents.forEach((incident: IncidentAlert) => {
      const ts = incident.anomaly.timestamp;
      const time = new Date(ts).getTime();

      events.push({
        timestamp: ts,
        time,
        type: 'anomaly',
        label: `${this.formatSensorType(incident.anomaly.sensor_type)} anomaly detected`,
        severity: incident.anomaly.severity,
        sensorType: incident.anomaly.sensor_type,
        zoneId: incident.anomaly.zone_id,
      });

      if (incident.measurement) {
        events.push({
          timestamp: ts,
          time: time - 1000,
          type: 'measurement',
          label: `Reading: ${this.formatMeasurementValue(incident.measurement)}`,
          value: this.formatMeasurementValue(incident.measurement),
          zoneId: incident.measurement.zone_id,
        });
      }
    });

    return events.sort((a, b) => a.time - b.time);
  });

  ngOnDestroy() {
    this.stopPlayback();
  }

  // ============ PUBLIC API ============
  setZone(zoneId: string | null) {
    this.zoneId.set(zoneId);
    // Reset AI state when zone changes
    this.aiExplanation.set(null);
    this.aiError.set(null);
    this.aiSource.set('fallback');
    // If currently on AI tab, load explanation for new zone
    if (this.activeTab() === 'ai' && zoneId) {
      this.loadAIExplanation();
    }
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'replay') {
      this.initializeReplay();
    } else {
      this.stopPlayback();
    }
    // Trigger AI loading when switching to AI tab
    if (tab === 'ai' && !this.aiExplanation() && !this.aiLoading() && this.zoneIncidents().length > 0) {
      this.loadAIExplanation();
    }
  }

  // ============ REPLAY CONTROLS ============
  initializeReplay() {
    if (!this.replayMode()) {
      this.service.startReplay();
    }
  }

  exitReplay() {
    this.stopPlayback();
    this.service.stopReplay();
  }

  togglePlayback() {
    if (this.isPlaying()) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  startPlayback() {
    const range = this.replayTimeRange();
    if (range.duration === 0) return;

    // Initialize if needed
    if (this.replayTime() === null) {
      this.service.setReplayTime(range.start);
    }

    this.isPlaying.set(true);

    const realTimePerTick = 50; // ms between updates
    const simulatedTimePerTick = (range.duration / 200) * this.playbackSpeed();

    this.playbackInterval = setInterval(() => {
      const current = this.replayTime() ?? range.start;
      const next = current + simulatedTimePerTick;

      if (next >= range.end) {
        this.service.setReplayTime(range.end);
        this.stopPlayback();
      } else {
        this.service.setReplayTime(next);
      }
    }, realTimePerTick);
  }

  stopPlayback() {
    this.isPlaying.set(false);
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  setPlaybackSpeed(speed: number) {
    this.playbackSpeed.set(speed);
    if (this.isPlaying()) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  onScrub(event: Event) {
    const input = event.target as HTMLInputElement;
    const percent = parseFloat(input.value);
    const range = this.replayTimeRange();
    const newTime = range.start + (range.duration * percent) / 100;
    this.service.setReplayTime(newTime);
  }

  jumpToEvent(index: number) {
    const events = this.allReplayEvents();
    if (index >= 0 && index < events.length) {
      this.service.setReplayTime(events[index].time);
    }
  }

  skipToStart() {
    const range = this.replayTimeRange();
    this.service.setReplayTime(range.start);
  }

  skipToEnd() {
    const range = this.replayTimeRange();
    this.service.setReplayTime(range.end);
  }

  isEventActive(event: ReplayEvent): boolean {
    const current = this.replayTime();
    if (current === null) return false;
    return event.time <= current;
  }

  isEventCurrent(index: number): boolean {
    return this.currentEventIndex() === index;
  }

  // ============ AI EXPLANATION ============
  async loadAIExplanation() {
    const incidents = this.zoneIncidents();
    if (incidents.length === 0) {
      this.aiError.set('No incidents in this zone to analyze.');
      return;
    }

    const incident = incidents[0];
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
      this.aiSource.set(response.source);
    } catch (err: any) {
      console.error('Failed to load AI explanation:', err);
      this.aiError.set(err?.error?.gemini_error || 'Failed to generate explanation. Please try again.');
    } finally {
      this.aiLoading.set(false);
    }
  }

  // ============ FORMATTING ============
  formatZoneName(zoneId: string): string {
    return this.service.getZoneName(zoneId);
  }

  formatSensorType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatMeasurementType(type: string): string {
    const map: Record<string, string> = {
      celsius: 'Temperature',
      percent: 'Humidity',
      count: 'Count',
      boolean: 'Status',
    };
    return map[type] || type;
  }

  formatMeasurementValue(m: Measurement): string {
    if (m.measurement_type === 'celsius') {
      return `${m.measurement_value?.toFixed(1)}°C`;
    }
    if (m.measurement_type === 'percent') {
      return `${m.measurement_value?.toFixed(0)}%`;
    }
    return m.measurement_value?.toString() ?? 'N/A';
  }

  formatTimestamp(ts: string): string {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatReplayTime(time: number | null): string {
    if (time === null) return '--:--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  getStateColor(state: string): string {
    const colors: Record<string, string> = {
      normal: 'bg-green-100 text-green-800 border-green-300',
      'at-risk': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      unsafe: 'bg-red-100 text-red-800 border-red-300',
      recovering: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[state] || colors['normal'];
  }

  getEventZoneColor(zoneId?: string): string {
    if (!zoneId) return 'bg-slate-500';
    const colors: Record<string, string> = {
      'zone-recv-1': 'bg-purple-500',
      'zone-cold-1': 'bg-blue-500',
      'zone-prep-1': 'bg-amber-500',
      'zone-cook-1': 'bg-red-500',
      'zone-wash-1': 'bg-cyan-500',
    };
    return colors[zoneId] || 'bg-slate-500';
  }
}