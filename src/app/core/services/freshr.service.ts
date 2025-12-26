import { Injectable, computed, signal, inject } from '@angular/core';
import { MockApiService } from './mock-api.service';
import { ApiService } from './api.service';
import { Anomaly, Incident, Measurement, ZoneState, Device } from '../models/types';
import { interval, switchMap, map, startWith, from } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FreshrService {
  // Dependency Injection - choose API based on environment
  private mockApi = inject(MockApiService);
  private realApi = inject(ApiService);
  private api = environment.useMockApi ? this.mockApi : this.realApi;

  // Signals for state
  private incidentsMap = signal<Map<string, 'Open' | 'Acknowledged' | 'Resolved'>>(new Map());
  readonly selectedContext = signal<{
    type: 'incident' | 'zone';
    data: any;
    id?: string;
  } | null>(null);

  readonly selectedZone = signal<string | null>(null);

  // Data Streams
  private polling$ = interval(2000).pipe(startWith(0));

  // Use from() to convert Promises to Observables
  readonly devices = toSignal(from(this.api.getDevices()).pipe(map((r) => r.devices)), {
    initialValue: [] as Device[],
  });

  readonly anomalies = toSignal(
    this.polling$.pipe(
      switchMap(() => from(this.api.getAnomaliesRecent()).pipe(map((r) => r.anomalies))),
    ),
    { initialValue: [] as Anomaly[] },
  );

  readonly measurements = toSignal(
    this.polling$.pipe(
      switchMap(() => from(this.api.getMeasurementsRecent()).pipe(map((r) => r.measurements))),
    ),
    { initialValue: [] as Measurement[] },
  );

  // Derived State - Map anomalies to Incidents using your existing type structure
  readonly incidents = computed(() => {
    const rawAnomalies = this.anomalies();
    const currentStateMap = this.incidentsMap();
    const meas = this.measurements();

    return rawAnomalies.map((anomaly) => {
      // Find linked measurement
      const measurement =
        meas.find((m) => m.sensor_id === anomaly.sensor_id) ||
        ({
          id: '',
          sensor_id: anomaly.sensor_id,
          sensor_type: anomaly.sensor_type,
          measurement_type: 'unknown',
          measurement_value: 0,
          timestamp: anomaly.timestamp,
          store_id: anomaly.store_id,
          zone_id: anomaly.zone_id,
        } as Measurement);

      const status = currentStateMap.get(anomaly.id) || 'Open';
      const requiredAction = this.getRequiredAction(anomaly, measurement);
      const zone_name = this.getZoneName(anomaly.zone_id);

      const incident: Incident = {
        anomaly,
        measurement,
        status,
        requiredAction,
        zone_name,
      };

      return incident;
    });
  });

  // Get zone state based on incidents
  readonly zoneStates = computed(() => {
    const incidents = this.incidents();
    const stateMap = new Map<string, ZoneState>();

    incidents.forEach((inc) => {
      if (inc.status === 'Resolved') return;

      const zoneId = inc.anomaly.zone_id;
      const current = stateMap.get(zoneId);

      // Map severity to ZoneState
      const newState: ZoneState =
        inc.anomaly.severity === 'critical' || inc.anomaly.severity === 'high'
          ? 'unsafe'
          : inc.anomaly.severity === 'medium'
            ? 'at-risk'
            : 'normal';

      // Only update if new state is worse
      if (!current || this.getStateLevel(newState) > this.getStateLevel(current)) {
        stateMap.set(zoneId, newState);
      }
    });

    return stateMap;
  });

  // Get measurements for a specific zone
  getZoneMeasurements(zoneId: string) {
    return computed(() => {
      return this.measurements().filter((m) => m.zone_id === zoneId);
    });
  }

  // Get incidents for a specific zone
  getZoneIncidents(zoneId: string) {
    return computed(() => {
      return this.incidents().filter((inc) => inc.anomaly.zone_id === zoneId);
    });
  }

  // Get the most recent measurement for a zone
  getZoneRecentMeasurement(zoneId: string) {
    return computed(() => {
      const zoneMeasurements = this.measurements().filter((m) => m.zone_id === zoneId);
      if (zoneMeasurements.length === 0) return null;

      // Sort by timestamp and get most recent
      return zoneMeasurements.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0];
    });
  }

  // Zone state helpers
  getZoneState(zoneId: string): ZoneState {
    return this.zoneStates().get(zoneId) || 'normal';
  }

  private getStateLevel(state: ZoneState): number {
    const levels: Record<ZoneState, number> = {
      normal: 0,
      recovering: 1,
      'at-risk': 2,
      unsafe: 3,
    };
    return levels[state] || 0;
  }

  // Incident management
  acknowledgeIncident(incidentId: string) {
    const map = new Map(this.incidentsMap());
    map.set(incidentId, 'Acknowledged');
    this.incidentsMap.set(map);
  }

  resolveIncident(incidentId: string) {
    const map = new Map(this.incidentsMap());
    map.set(incidentId, 'Resolved');
    this.incidentsMap.set(map);
  }

  // Context management
  selectZone(zoneId: string) {
    this.selectedZone.set(zoneId);
    this.selectedContext.set({
      type: 'zone',
      data: { zone_id: zoneId },
      id: zoneId,
    });
  }

  selectIncident(incident: Incident) {
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

  // Scenario management (for demo mode with mock API)
  setScenario(scenario: any) {
    if (environment.useMockApi && 'setScenario' in this.mockApi) {
      this.mockApi.setScenario(scenario);
    }
  }

  // Helper methods
  private getRequiredAction(anomaly: Anomaly, measurement: Measurement): string {
    const sensorType = anomaly.sensor_type;

    switch (sensorType) {
      case 'cold_storage_temperature':
        return measurement.measurement_value > 8 ? 'HOLD ITEMS + VERIFY TEMP' : 'VERIFY TEMP';
      case 'handwash':
        return 'SANITIZE + RETRAIN';
      case 'station_contact':
        return 'SANITIZE STATION';
      case 'cook_temp':
        return 'VERIFY COOKING TEMP';
      case 'dish_wash':
        return 'RE-WASH + VERIFY TEMP';
      default:
        return 'INVESTIGATE';
    }
  }

  private getZoneName(zoneId: string): string {
    const zoneNames: Record<string, string> = {
      'zone-recv-1': 'Receiving',
      'zone-cold-1': 'Cold Storage',
      'zone-prep-1': 'Prep Station',
      'zone-cook-1': 'Cook Line',
      'zone-plate-1': 'Plating',
      'zone-wash-1': 'Washing',
    };

    return zoneNames[zoneId] || zoneId.replace(/-/g, ' ').replace(/zone/i, '').trim();
  }
}
