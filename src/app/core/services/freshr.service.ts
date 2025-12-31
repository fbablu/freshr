import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Anomaly, Measurement, IncidentAlert, ZoneState } from '../models/types';
import { Scenario, SCENARIOS } from '../../scenarios/scenarios.config';

@Injectable({
  providedIn: 'root',
})
export class FreshrService {
  private api = inject(ApiService);
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  // Core data
  readonly measurements = signal<Measurement[]>([]);
  readonly anomalies = signal<Anomaly[]>([]);
  readonly incidentsMap = signal<Map<string, 'Open' | 'Resolved'>>(new Map());

  // Scenario - full scenario object for incident rules
  private _activeScenario = signal<Scenario>(SCENARIOS[0]);
  readonly activeScenario = this._activeScenario.asReadonly();

  // Demo scenario ID - for API calls (Kafka, social, etc.)
  // Maps to backend scenarios: 'ecoli' | 'drift' | 'hygiene' | 'recovery' | 'normal'
  private _demoScenarioId = signal<string>('ecoli');
  readonly demoScenarioId = this._demoScenarioId.asReadonly();

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

  constructor() {
    this.loadData();
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  // ============ POLLING ============
  private startPolling() {
    this.pollingInterval = setInterval(() => {
      this.loadData();
    }, 3000);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async loadData() {
    try {
      const [measRes, anomRes] = await Promise.all([
        this.api.getMeasurementsRecent(),
        this.api.getAnomaliesRecent({ limit: 50 }),
      ]);
      this.measurements.set(measRes.measurements || []);
      this.anomalies.set(anomRes.anomalies || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  // ============ DERIVED: INCIDENTS ============
  readonly incidents = computed(() => {
    const anomalies = this.anomalies();
    const measurements = this.measurements();
    const incMap = this.incidentsMap();
    const scenario = this.activeScenario();

    const baseIncidents: IncidentAlert[] = anomalies
      .map((anomaly) => {
        const measurement = measurements.find((m) => m.id === anomaly.measurement_id) || null;
        const zoneId = anomaly.zone_id || measurement?.zone_id || 'unknown';
        const existingStatus = incMap.get(anomaly.id);
        const status = existingStatus || 'Open';

        const incident: IncidentAlert = {
          anomaly: {
            ...anomaly,
            zone_id: zoneId,
            severity: this.calculateSeverity(anomaly, measurement ?? undefined),
          },
          measurement,
          status,
          requiredAction: this.getRequiredAction(anomaly, measurement ?? undefined),
          zone_name: this.getZoneName(zoneId),
        };

        return incident;
      })
      .filter((inc): inc is IncidentAlert => inc !== null);

    return this.applyScenarioRules(baseIncidents, scenario);
  });

  // ============ TIME-FILTERED INCIDENTS ============
  readonly visibleIncidents = computed(() => {
    const allIncidents = this.incidents();
    const isReplay = this.replayMode();
    const time = this.replayTime();

    if (!isReplay || time === null) {
      return allIncidents;
    }

    return allIncidents.filter((inc) => {
      const incidentTime = new Date(inc.anomaly.timestamp).getTime();
      return incidentTime <= time;
    });
  });

  // ============ ZONE STATES (REPLAY-AWARE) ============
  readonly zoneStates = computed(() => {
    const incidents = this.visibleIncidents();
    const stateMap = new Map<string, ZoneState>();

    incidents.forEach((inc) => {
      if (inc.status === 'Resolved') return;

      const zoneId = inc.anomaly.zone_id;
      if (!zoneId) return;

      const current = stateMap.get(zoneId);

      const newState: ZoneState =
        inc.anomaly.severity === 'critical' || inc.anomaly.severity === 'high'
          ? 'unsafe'
          : inc.anomaly.severity === 'medium'
            ? 'at-risk'
            : 'normal';

      if (!current || this.isWorseState(newState, current)) {
        stateMap.set(zoneId, newState);
      }
    });

    return stateMap;
  });

  readonly latestMeasurementByZone = computed(() => {
    const measurements = this.measurements();
    const byZone = new Map<string, Measurement>();

    measurements.forEach((m) => {
      const zoneId = m.zone_id;
      if (!zoneId) return;
      const existing = byZone.get(zoneId);
      if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
        byZone.set(zoneId, m);
      }
    });

    return byZone;
  });

  readonly latestMeasurement = computed(() => {
    const meas = this.measurements();
    return meas.length > 0 ? meas[0] : null;
  });

  // ============ REPLAY METHODS ============
  startReplay() {
    this.replayMode.set(true);
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

  // ============ ZONE HELPERS (PUBLIC) ============
  getZoneState(zoneId: string): ZoneState {
    return this.zoneStates().get(zoneId) || 'normal';
  }

  getZoneIncidents(zoneId: string) {
    return computed(() => {
      return this.visibleIncidents().filter((inc) => inc.anomaly.zone_id === zoneId);
    });
  }

  getZoneMeasurements(zoneId: string) {
    return computed(() => {
      const isReplay = this.replayMode();
      const time = this.replayTime();

      let meas = this.measurements().filter((m) => m.zone_id === zoneId);

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

  getZoneName(zoneId: string): string {
    const zoneNames: Record<string, string> = {
      receiving: 'Receiving',
      'zone-recv-1': 'Receiving',
      storage: 'Cold Storage',
      'zone-cold-1': 'Cold Storage',
      prep: 'Prep Area',
      'zone-prep-1': 'Prep Area',
      cook: 'Cook Line',
      'zone-cook-1': 'Cook Line',
      washing: 'Wash Station',
      'zone-wash-1': 'Wash Station',
      assembly: 'Assembly',
    };
    return zoneNames[zoneId] || zoneId;
  }

  // ============ SCENARIO & DATA ============
  setScenario(scenario: Scenario) {
    this._activeScenario.set(scenario);
  }

  setDemoScenarioId(scenarioId: string) {
    this._demoScenarioId.set(scenarioId);
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
    console.log('Incident acknowledged:', anomalyId);
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

  private getRequiredAction(anomaly: Anomaly, measurement?: Measurement): string {
    if (anomaly.sensor_type === 'cold_storage_temperature') {
      return 'HOLD + VERIFY TEMP';
    }
    if (anomaly.sensor_type === 'handwash' || anomaly.sensor_type.includes('handwash')) {
      return 'SANITIZE + RETRAIN';
    }
    return 'INVESTIGATE';
  }

  private calculateSeverity(
    anomaly: Anomaly,
    measurement?: Measurement,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (anomaly.severity) return anomaly.severity;

    if (anomaly.sensor_type === 'cold_storage_temperature' && measurement?.measurement_value) {
      if (measurement.measurement_value > 12) return 'critical';
      if (measurement.measurement_value > 8) return 'high';
      if (measurement.measurement_value > 5) return 'medium';
    }
    return anomaly.score && anomaly.score > 0.9 ? 'high' : 'medium';
  }
}
