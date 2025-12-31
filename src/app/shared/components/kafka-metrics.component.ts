import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, KafkaMetrics, KafkaStatus } from '../../core/services/api.service';
import { FreshrService } from '../../core/services/freshr.service';

type ViewMode = 'overview' | 'topics' | 'pipeline';

@Component({
  selector: 'app-kafka-metrics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './kafka-metrics.component.html',
})
export class KafkaMetricsComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  freshrService = inject(FreshrService);

  viewMode = signal<ViewMode>('overview');
  loading = signal(false);
  metrics = signal<KafkaMetrics | null>(null);
  status = signal<KafkaStatus | null>(null);

  // Use the demo scenario ID directly from FreshrService
  currentScenarioId = this.freshrService.demoScenarioId;

  viewModes = [
    { id: 'overview' as ViewMode, label: 'Overview' },
    { id: 'topics' as ViewMode, label: 'Topics' },
    { id: 'pipeline' as ViewMode, label: 'Pipeline' },
  ];

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.loadData();
    this.refreshInterval = setInterval(() => this.loadData(), 10000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadData() {
    this.loading.set(true);
    try {
      const scenario = this.currentScenarioId();
      const [statusRes, metricsRes] = await Promise.all([
        this.api.getKafkaStatus(scenario),
        this.api.getKafkaMetrics(scenario),
      ]);
      this.status.set(statusRes);
      this.metrics.set(metricsRes);
    } catch (err) {
      console.error('Failed to load Kafka data:', err);
      this.status.set({
        connected: false,
        cluster_id: 'cluster_0',
        broker_count: 1,
        bootstrap_server: '',
        environment: 'Confluent Cloud',
        security_protocol: 'SASL_SSL',
        error: 'Failed to connect',
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.loading.set(false);
    }
  }

  refresh() {
    this.loadData();
  }

  formatTime(timestamp: string | undefined): string {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
}
