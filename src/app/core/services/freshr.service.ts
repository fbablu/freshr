import { Injectable, computed, signal, effect, inject } from '@angular/core';
import { MockApiService } from './mock-api.service';
import { Anomaly, Incident, Measurement, Zone, ZoneState, Device } from '../models/types';
import { interval, switchMap, combineLatest, map, startWith, from } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root', // Ensure this is provided in root
})
export class FreshrService {
  // Dependency Injection
  private api = inject(MockApiService);

  // Signals for state
  private incidentsMap = signal<Map<string, 'Open' | 'Acknowledged' | 'Resolved'>>(new Map());
  readonly selectedContext = signal<{
    type: 'incident' | 'zone';
    data: any;
    id?: string;
  } | null>(null);

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

  // Derived State
  readonly incidents = computed(() => {
    const rawAnomalies = this.anomalies();
    const currentStateMap = this.incidentsMap();
    const dev = this.devices() as Device[];
    const meas = this.measurements();

    // Map anomalies to Incidents
    return rawAnomalies.map((a) => {
      // Find linked measurement
      const m = meas.find((x) => x.sensor_id === a.sensor_id) || ({} as Measurement);
      const d = dev.find((x) => x.sensor_id === a.sensor_id);

      const status = currentStateMap.get(a.id) || 'Open';

      // Filter: Only show unresolved or recently resolved in lists?
      // User said "Incidents view... status Open/Ack/Resolved".
      // We'll return all recent anomalies as incidents.

      return {
        anomaly: a,
        measurement: m,
        status: status,
        requiredAction: this.deriveAction(a.sensor_type, a.severity),
        zone_name: this.getZoneName(a.zone_id),
      } as Incident;
    });
  });

  readonly zoneStates = computed(() => {
    const currentIncidents = this.incidents();
    // Default zones
    const zones: Record<string, { name: string; state: ZoneState; activeCount: number }> = {
      'zone-cold-1': { name: 'Cold Storage', state: 'normal', activeCount: 0 },
      'zone-prep-1': { name: 'Prep', state: 'normal', activeCount: 0 },
      'zone-cook-1': { name: 'Cook Line', state: 'normal', activeCount: 0 },
      'zone-plate-1': { name: 'Plating', state: 'normal', activeCount: 0 },
      'zone-wash-1': { name: 'Dish/Handwash', state: 'normal', activeCount: 0 },
      'zone-recv-1': { name: 'Receiving', state: 'normal', activeCount: 0 },
    };

    currentIncidents.forEach((inc) => {
      if (inc.status === 'Resolved') return; // Don't count resolved for risk state

      const z = zones[inc.anomaly.zone_id];
      if (!z) return;

      z.activeCount++;

      if (inc.anomaly.severity === 'critical' || inc.anomaly.severity === 'high') {
        z.state = 'unsafe';
      } else if (
        (inc.anomaly.severity === 'medium' || inc.anomaly.severity === 'low') &&
        z.state !== 'unsafe'
      ) {
        z.state = 'at-risk';
      }
    });

    return zones;
  });

  constructor() {}

  acknowledgeIncident(id: string) {
    this.incidentsMap.update((map) => {
      const newMap = new Map(map);
      newMap.set(id, 'Acknowledged');
      return newMap;
    });
  }

  resolveIncident(id: string) {
    this.incidentsMap.update((map) => {
      const newMap = new Map(map);
      newMap.set(id, 'Resolved');
      return newMap;
    });
  }

  getScenario() {
    // expose control
  }

  setScenario(name: any) {
    this.api.setScenario(name);
  }

  private deriveAction(sensorType: string, severity: string): string {
    if (
      sensorType === 'cold_storage_temperature' &&
      (severity === 'high' || severity === 'critical')
    ) {
      return 'HOLD + VERIFY TEMP';
    }
    if (sensorType === 'handwash' || sensorType === 'dish_wash') {
      return 'SANITIZE + RETRAIN';
    }
    if (sensorType === 'ingredient_flow' || sensorType === 'station_contact') {
      return 'DISCARD + SANITIZE';
    }
    return 'MONITOR';
  }

  private getZoneName(id: string): string {
    const map: any = {
      'zone-cold-1': 'Cold Storage',
      'zone-prep-1': 'Prep',
      'zone-cook-1': 'Cook Line',
      'zone-plate-1': 'Plating',
      'zone-wash-1': 'Dish/Handwash',
      'zone-recv-1': 'Receiving',
    };
    return map[id] || id;
  }
}
