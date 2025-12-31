import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, ScenarioInfo } from '../../core/services/api.service';
import { FreshrService } from '../../core/services/freshr.service';

@Component({
  selector: 'app-demo-controls',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './demo-controls.component.html',
})
export class DemoControlsComponent {
  api = inject(ApiService);
  freshrService = inject(FreshrService);

  expanded = signal(false);
  loading = signal(false);
  activeScenario = signal<string | null>(null);
  statusMessage = signal<string | null>(null);
  statusType = signal<'success' | 'error' | 'loading'>('success');

  scenarios = signal<ScenarioInfo[]>([
    {
      id: 'ecoli',
      name: "McDonald's E. coli Outbreak",
      description: 'Oct 2024 - Multi-zone contamination scenario',
    },
    {
      id: 'drift',
      name: 'Temperature Drift',
      description: 'Cold storage failure simulation',
    },
    {
      id: 'hygiene',
      name: 'Hygiene Failure',
      description: 'Handwash compliance drops',
    },
    {
      id: 'recovery',
      name: 'Recovery Mode',
      description: 'System recovering from incident',
    },
    {
      id: 'normal',
      name: 'Normal Operations',
      description: 'Healthy baseline state',
    },
  ]);

  async runScenario(scenarioId: string) {
    this.loading.set(true);
    this.statusMessage.set('Loading scenario...');
    this.statusType.set('loading');

    try {
      const result = await this.api.seedScenario(scenarioId, true);
      this.activeScenario.set(scenarioId);
      this.statusMessage.set(
        `✓ Created ${result.created.measurements} measurements, ${result.created.anomalies} anomalies`,
      );
      this.statusType.set('success');

      // Clear status after delay
      setTimeout(() => this.statusMessage.set(null), 3000);
    } catch (err) {
      console.error('Failed to seed scenario:', err);
      this.statusMessage.set('Failed to load scenario');
      this.statusType.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  async clearData() {
    this.loading.set(true);
    this.statusMessage.set('Clearing data...');
    this.statusType.set('loading');

    try {
      await this.api.clearData();
      this.activeScenario.set(null);
      this.statusMessage.set('✓ Data cleared');
      this.statusType.set('success');
      setTimeout(() => this.statusMessage.set(null), 2000);
    } catch (err) {
      console.error('Failed to clear data:', err);
      this.statusMessage.set('Failed to clear data');
      this.statusType.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  refresh() {
    // Force refresh by triggering the polling
    this.statusMessage.set('✓ Refreshing...');
    this.statusType.set('success');
    setTimeout(() => this.statusMessage.set(null), 1000);
  }
}
