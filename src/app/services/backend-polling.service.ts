import { Injectable, signal } from '@angular/core';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Incident } from '../core/models/types';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  dateRange: { start: string; end: string };
  focusSensors: string[];
  incidentRules: IncidentRule[];
}

export interface IncidentRule {
  type: 'temperature_drift' | 'hygiene_failure' | 'cross_contamination' | 'time_violation';
  sensorTypes: string[];
  threshold: { positive?: number; negative?: number; consecutive?: number };
  zones: string[];
  severity: 'critical' | 'warning' | 'info';
  title: string;
  actions: string[];
}

@Injectable({ providedIn: 'root' })
export class BackendPollingService {
  private baseUrl = 'https://freshr-api-955904730088.us-central1.run.app';

  measurements = signal<any[]>([]);
  anomalies = signal<any[]>([]);
  derivedIncidents = signal<Incident[]>([]);

  activeScenario = signal<Scenario | null>(null);

  startPolling(scenario: Scenario) {
    this.activeScenario.set(scenario);

    // Poll every 2 seconds
    interval(2000)
      .pipe(
        switchMap(() =>
          Promise.all([
            fetch(`${this.baseUrl}/measurements/recent`).then((r) => r.json()),
            fetch(`${this.baseUrl}/anomalies/recent`).then((r) => r.json()),
          ]),
        ),
      )
      .subscribe(([mData, aData]) => {
        this.measurements.set(mData.measurements);
        this.anomalies.set(aData.anomalies);
        this.deriveIncidents();
      });
  }

  private deriveIncidents() {
    const scenario = this.activeScenario();
    if (!scenario) return;

    const incidents: Incident[] = [];
    const anomalyMap = new Map(this.anomalies().map((a) => [a.measurement_id, a]));

    // Group measurements by sensor type and zone
    const sensorGroups = this.groupBySensorType(this.measurements());

    scenario.incidentRules.forEach((rule) => {
      const relevantSensors = sensorGroups.filter((g) => rule.sensorTypes.includes(g.sensorType));

      relevantSensors.forEach((group) => {
        const anomalousCount = group.measurements.filter((m) => {
          const anomaly = anomalyMap.get(m.id);
          return (
            anomaly &&
            ((rule.threshold.positive && anomaly.anomaly === 'positive') ||
              (rule.threshold.negative && anomaly.anomaly === 'negative'))
          );
        }).length;

        if (anomalousCount >= (rule.threshold.consecutive || 1)) {
          incidents.push({
            id: `${rule.type}-${group.sensorType}-${Date.now()}`,
            type: rule.type,
            title: rule.title,
            severity: rule.severity,
            zones: rule.zones,
            timestamp: new Date().toISOString(),
            sensors: group.measurements.map((m) => m.sensor_id),
            actions: rule.actions,
            measurements: group.measurements,
          });
        }
      });
    });

    this.derivedIncidents.set(incidents);
  }

  private groupBySensorType(measurements: any[]) {
    const groups = new Map<string, any[]>();
    measurements.forEach((m) => {
      if (!groups.has(m.sensor_type)) {
        groups.set(m.sensor_type, []);
      }
      groups.get(m.sensor_type)!.push(m);
    });
    return Array.from(groups.entries()).map(([sensorType, measurements]) => ({
      sensorType,
      measurements,
    }));
  }
}
