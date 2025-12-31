import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Anomaly, Measurement, IncidentAlert, ZoneState } from '../models/types';
import { Scenario, SCENARIOS } from '../../scenarios/scenarios.config';

@Injectable({
  providedIn: 'root',
})
export class FreshrService {
  private api = inject(ApiService);

  // Core data
  readonly measurements = signal<Measurement[]>([]);
  readonly anomalies = signal<Anomaly[]>([]);
  readonly incidentsMap = signal<Map<string, 'Open' | 'Resolved'>>(new Map());

  // Scenario
  private _activeScenario = signal<Scenario>(SCENARIOS[0]);
  readonly activeScenario = this._activeScenario.asReadonly();

  // Selection state
  readonly selectedZone = signal<string | null>(null);
  readonly selectedContext = signal<{
    type: 'zone' | 'incident';
    data: any;
    id: string;
  } | null>(null);

  // ============ REPLAY STATE ============
  readonly replayMode = signal(false);
  readonly replayTime = signal<number | null>(null); // Unix timestamp in ms

  // ============ INCIDENTS ============
  readonly incidents = computed(() => {
    const rawAnomalies = this.anomalies();
    const currentStateMap = this.incidentsMap();
    const meas = this.measurements();
    const scenario = this.activeScenario();

    const baseIncidents = rawAnomalies
      .map((anomaly) => {
        const measurement = meas.find((m) => m.id === anomaly.measurement_id);
        if (!measurement || !measurement.zone_id) return null;

        const status = currentStateMap.get(anomaly.id) || 'Open';
        const requiredAction = this.getRequiredAction(anomaly, measurement);
        const zone_name = this.getZoneName(measurement.zone_id);

        const incident: IncidentAlert = {
          anomaly: {
            ...anomaly,
            zone_id: measurement.zone_id,
            store_id: measurement.store_id,
            sensor_id: measurement.sensor_id,
            severity: this.calculateSeverity(anomaly, measurement),
          },
          measurement,
          status,
          requiredAction,
          zone_name,
        };

        return incident;
      })
      .filter((inc): inc is IncidentAlert => inc !== null);

    return this.applyScenarioRules(baseIncidents, scenario);
  });

  // ============ TIME-FILTERED INCIDENTS ============
  // These are the incidents visible at current replay time
  readonly visibleIncidents = computed(() => {
    const allIncidents = this.incidents();
    const isReplay = this.replayMode();
    const time = this.replayTime();

    if (!isReplay || time === null) {
      // Not in replay mode - show all incidents
      return allIncidents;
    }

    // Filter to only incidents that occurred at or before replay time
    return allIncidents.filter((inc) => {
      const incidentTime = new Date(inc.anomaly.timestamp).getTime();
      return incidentTime <= time;
    });
  });

  // ============ ZONE STATES (REPLAY-AWARE) ============
  readonly zoneStates = computed(() => {
    // Use visibleIncidents which respects replay time
    const incidents = this.visibleIncidents();
    const stateMap = new Map<string, ZoneState>();

    incidents.forEach((inc) => {
      if (inc.status === 'Resolved') return;

      const zoneId = inc.measurement.zone_id;
      if (!zoneId) return;

      const current = stateMap.get(zoneId);

      const newState: ZoneState =
        inc.anomaly.severity === 'critical' || inc.anomaly.severity === 'high'
          ? 'unsafe'
          : inc.anomaly.severity === 'medium'
            ? 'at-risk'
            : 'normal';

      // Keep worst state
      if (!current || this.isWorseState(newState, current)) {
        stateMap.set(zoneId, newState);
      }
    });

    return stateMap;
  });

  // ============ REPLAY METHODS ============
  startReplay() {
    this.replayMode.set(true);
    // Initialize to earliest incident time minus buffer
    const incidents = this.incidents();
    if (incidents.length > 0) {
      const times = incidents.map((i) => new Date(i.anomaly.timestamp).getTime());
      const earliest = Math.min(...times);
      this.replayTime.set(earliest - 60000); // 1 min before first incident
    }
  }

  stopReplay() {
    this.replayMode.set(false);
    this.replayTime.set(null);
  }

  setReplayTime(time: number) {
    this.replayTime.set(time);
  }

  getReplayTimeRange(): { start: number; end: number; duration: number } {
    const incidents = this.incidents();
    if (incidents.length === 0) {
      const now = Date.now();
      return { start: now - 600000, end: now, duration: 600000 };
    }

    const times = incidents.map((i) => new Date(i.anomaly.timestamp).getTime());
    const earliest = Math.min(...times);
    const latest = Math.max(...times);
    const padding = Math.max((latest - earliest) * 0.15, 60000);

    return {
      start: earliest - padding,
      end: latest + padding,
      duration: latest - earliest + padding * 2,
    };
  }

  // ============ ZONE HELPERS ============
  getZoneState(zoneId: string): ZoneState {
    return this.zoneStates().get(zoneId) || 'normal';
  }

  getZoneIncidents(zoneId: string) {
    return computed(() => {
      // Use visibleIncidents for replay-aware filtering
      return this.visibleIncidents().filter((inc) => inc.measurement.zone_id === zoneId);
    });
  }

  getZoneMeasurements(zoneId: string) {
    return computed(() => {
      const isReplay = this.replayMode();
      const time = this.replayTime();

      let meas = this.measurements().filter((m) => m.zone_id === zoneId);

      // Filter by replay time if active
      if (isReplay && time !== null) {
        meas = meas.filter((m) => new Date(m.timestamp).getTime() <= time);
      }

      return meas;
    });
  }

  getZoneRecentMeasurement(zoneId: string) {
    return computed(() => {
      const meas = this.getZoneMeasurements(zoneId)();
      return meas.length > 0 ? meas[0] : null;
    });
  }

  // ============ SCENARIO & DATA ============
  setScenario(scenario: Scenario) {
    this._activeScenario.set(scenario);
  }

  setMeasurements(data: Measurement[]) {
    this.measurements.set(data);
  }

  setAnomalies(data: Anomaly[]) {
    this.anomalies.set(data);
  }

  resolveIncident(anomalyId: string) {
    const map = new Map(this.incidentsMap());
    map.set(anomalyId, 'Resolved');
    this.incidentsMap.set(map);
  }

  acknowledgeIncident(anomalyId: string) {
    // For now, acknowledgement doesn't change status - could add 'Acknowledged' state if needed
    console.log('Incident acknowledged:', anomalyId);
  }

  // ============ PRIVATE HELPERS ============
  private isWorseState(newState: ZoneState, current: ZoneState): boolean {
    const severity: Record<ZoneState, number> = {
      normal: 0,
      recovering: 1,
      'at-risk': 2,
      unsafe: 3,
    };
    return severity[newState] > severity[current];
  }

  private applyScenarioRules(incidents: IncidentAlert[], scenario: Scenario): IncidentAlert[] {
    return incidents.map((inc) => {
      const rule = scenario.incidentRules.find((r) =>
        r.sensorTypes.includes(inc.anomaly.sensor_type),
      );

      if (rule) {
        return {
          ...inc,
          requiredAction: rule.actions.join(' | '),
          anomaly: {
            ...inc.anomaly,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
          },
        };
      }
      return inc;
    });
  }

  private getRequiredAction(anomaly: Anomaly, measurement: Measurement): string {
    if (anomaly.sensor_type === 'cold_storage_temperature') {
      return 'HOLD + VERIFY TEMP';
    }
    if (anomaly.sensor_type === 'handwash' || anomaly.sensor_type.includes('handwash')) {
      return 'SANITIZE + RETRAIN';
    }
    return 'INVESTIGATE';
  }

  // ============ SELECTION METHODS ============
  selectZone(zoneId: string) {
    this.selectedZone.set(zoneId);
    this.selectedContext.set({
      type: 'zone',
      data: { zone_id: zoneId },
      id: zoneId,
    });
  }

  selectIncident(incident: IncidentAlert) {
    this.selectedContext.set({
      type: 'incident',
      data: incident,
      id: incident.anomaly.id,
    });
  }

  clearSelection() {
    this.selectedZone.set(null);
    this.selectedContext.set(null);
  }

  private calculateSeverity(
    anomaly: Anomaly,
    measurement: Measurement,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (anomaly.severity) return anomaly.severity;

    if (anomaly.sensor_type === 'cold_storage_temperature' && measurement.measurement_value) {
      if (measurement.measurement_value > 12) return 'critical';
      if (measurement.measurement_value > 8) return 'high';
      if (measurement.measurement_value > 5) return 'medium';
    }
    return anomaly.score && anomaly.score > 0.9 ? 'high' : 'medium';
  }

  getZoneName(zoneId: string): string {
    const names: Record<string, string> = {
      'zone-recv-1': 'Receiving',
      'zone-cold-1': 'Cold Storage',
      'zone-prep-1': 'Prep Station',
      'zone-cook-1': 'Cook Line',
      'zone-wash-1': 'Washing',
    };
    return names[zoneId] || zoneId;
  }
}
