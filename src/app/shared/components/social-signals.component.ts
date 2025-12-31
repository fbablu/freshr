import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  ApiService,
  SocialSignal,
  TimelineEvent,
  CorrelationResponse,
} from '../../core/services/api.service';

type ViewMode = 'signals' | 'timeline' | 'insight';

@Component({
  selector: 'app-social-signals',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './social-signals.component.html',
})
export class SocialSignalsComponent implements OnInit {
  api = inject(ApiService);

  viewMode = signal<ViewMode>('signals');
  loading = signal(false);
  signals = signal<SocialSignal[]>([]);
  timeline = signal<TimelineEvent[]>([]);
  correlation = signal<CorrelationResponse | null>(null);

  viewModes = [
    { id: 'signals' as ViewMode, label: 'Signals' },
    { id: 'timeline' as ViewMode, label: 'Timeline' },
    { id: 'insight' as ViewMode, label: 'Insight' },
  ];

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const [signalsRes, timelineRes, correlationRes] = await Promise.all([
        this.api.getSocialSignals('ecoli'),
        this.api.getSocialTimeline('ecoli'),
        this.api.getSocialCorrelation('ecoli'),
      ]);
      this.signals.set(signalsRes.signals);
      this.timeline.set(timelineRes.timeline);
      this.correlation.set(correlationRes);
    } catch (err) {
      console.error('Failed to load social data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  refresh() {
    this.loadData();
  }

  formatSeverity(severity: string): string {
    const map: Record<string, string> = {
      early_signal: 'Early Signal',
      escalating: 'Escalating',
      confirmed: 'Confirmed',
      outbreak: 'Outbreak',
      observed: 'Observed',
    };
    return map[severity] || severity;
  }
}
