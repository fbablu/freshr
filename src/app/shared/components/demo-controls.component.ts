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
  statusMessage = signal<string | null>(null);
  statusType = signal<'success' | 'error' | 'loading'>('success');

  // Use FreshrService as source of truth for active scenario
  activeScenario = this.freshrService.demoScenarioId;

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

      // Update FreshrService with the new scenario ID
      this.freshrService.setDemoScenarioId(scenarioId);

      // Refresh data to pick up new seeded data
      await this.freshrService.loadData();

      this.statusMessage.set(
        `✓ Created ${result.created.measurements} measurements, ${result.created.anomalies} anomalies`,
      );
      this.statusType.set('success');

      setTimeout(() => this.statusMessage.set(null), 3000);
    } catch (err) {
      console.error('Failed to run scenario:', err);
      this.statusMessage.set('✗ Failed to load scenario');
      this.statusType.set('error');
      setTimeout(() => this.statusMessage.set(null), 3000);
    } finally {
      this.loading.set(false);
    }
  }

  async clearData() {
    this.loading.set(true);
    try {
      await this.api.clearData();
      this.freshrService.setDemoScenarioId('normal');
      await this.freshrService.loadData();
      this.statusMessage.set('✓ Data cleared');
      this.statusType.set('success');
      setTimeout(() => this.statusMessage.set(null), 3000);
    } catch (err) {
      console.error('Failed to clear data:', err);
      this.statusMessage.set('✗ Failed to clear data');
      this.statusType.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  async refresh() {
    this.loading.set(true);
    try {
      await this.freshrService.loadData();
      this.statusMessage.set('✓ Data refreshed');
      this.statusType.set('success');
      setTimeout(() => this.statusMessage.set(null), 2000);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      this.loading.set(false);
    }
  }
}
