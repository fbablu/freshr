import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';

interface TopicMetric {
  topic: string;
  category: string;
  messages_per_second: number;
  partitions: number;
  status: string;
}

interface ConsumerGroup {
  group_id: string;
  state: string;
  members: number;
  lag: number;
  topics: string[];
}

interface PipelineStage {
  id: string;
  name: string;
  status: string;
}

interface KafkaMetrics {
  overview: {
    total_messages_per_second: number;
    messages_last_minute: number;
    messages_last_5_minutes: number;
    active_topics: number;
    total_topics: number;
  };
  topics: TopicMetric[];
  consumer_groups: ConsumerGroup[];
  pipeline: {
    producer: { status: string; service: string };
    consumer: { status: string; service: string };
    processor: { status: string; service: string };
  };
  timestamp: string;
}

interface KafkaStatus {
  connected: boolean;
  cluster_id: string;
  broker_count: number;
  bootstrap_server: string;
  environment: string;
  security_protocol: string;
  error: string | null;
  timestamp: string;
}

type ViewMode = 'overview' | 'topics' | 'pipeline';

@Component({
  selector: 'app-kafka-metrics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './kafka-metrics.component.html',
})
export class KafkaMetricsComponent implements OnInit, OnDestroy {
  api = inject(ApiService);

  viewMode = signal<ViewMode>('overview');
  loading = signal(false);
  metrics = signal<KafkaMetrics | null>(null);
  status = signal<KafkaStatus | null>(null);

  viewModes = [
    { id: 'overview' as ViewMode, label: 'Overview' },
    { id: 'topics' as ViewMode, label: 'Topics' },
    { id: 'pipeline' as ViewMode, label: 'Pipeline' },
  ];

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.loadData();
    // Auto-refresh every 10 seconds
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
      const [statusRes, metricsRes] = await Promise.all([
        this.api.getKafkaStatus(),
        this.api.getKafkaMetrics(),
      ]);
      this.status.set(statusRes);
      this.metrics.set(metricsRes);
    } catch (err) {
      console.error('Failed to load Kafka data:', err);
      // Set fallback status
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
