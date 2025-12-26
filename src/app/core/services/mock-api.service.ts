import { Injectable } from '@angular/core';
import {
  AnomaliesAggregateResponse,
  AnomaliesBySensorResponse,
  AnomaliesRecentResponse,
  Anomaly,
  Device,
  Measurement,
  MeasurementsCountResponse,
  MeasurementsRecentResponse,
  MeasurementTypeResponse,
  MeasurementsValuesResponse,
  TimeSeriesResponse,
  SensorType,
  Severity,
  DevicesResponse,
} from '../models/types';

@Injectable({
  providedIn: 'root',
})
export class MockApiService {
  private _intervalId: any;
  private _scenario: 'normal' | 'drift' | 'hygiene' | 'contamination' | 'recovery' = 'normal';

  // Master Data
  private devices: Device[] = [
    {
      sensor_id: 'cs-1',
      sensor_type: 'cold_storage_temperature',
      measurement_type: 'celsius',
      zone_id: 'zone-cold-1',
    },
    {
      sensor_id: 'pl-1',
      sensor_type: 'station_contact',
      measurement_type: 'contact',
      zone_id: 'zone-plate-1',
    },
    {
      sensor_id: 'ck-1',
      sensor_type: 'cook_temp',
      measurement_type: 'celsius',
      zone_id: 'zone-cook-1',
    },
    {
      sensor_id: 'pp-1',
      sensor_type: 'ingredient_flow',
      measurement_type: 'flow_rate',
      zone_id: 'zone-prep-1',
    },
    {
      sensor_id: 'dw-1',
      sensor_type: 'dish_wash',
      measurement_type: 'temperature',
      zone_id: 'zone-wash-1',
    },
    {
      sensor_id: 'hw-1',
      sensor_type: 'handwash',
      measurement_type: 'event',
      zone_id: 'zone-wash-1',
    },
    {
      sensor_id: 'rc-1',
      sensor_type: 'cold_storage_temperature',
      measurement_type: 'celsius',
      zone_id: 'zone-recv-1',
    },
  ];

  // State
  private measurements: Map<string, Measurement> = new Map(); // Recent per sensor
  private anomalies: Anomaly[] = [];
  private historyMeasurements: Measurement[] = []; // For time-series

  constructor() {
    this.initData();
    this.startSimulation();
  }

  setScenario(scenario: 'normal' | 'drift' | 'hygiene' | 'contamination' | 'recovery') {
    this._scenario = scenario;
    if (scenario === 'recovery') {
      this.resolveAllAnomalies();
    }
  }

  private initData() {
    const now = new Date();
    this.devices.forEach((d) => {
      const m = this.generateMeasurement(d, now);
      this.measurements.set(d.sensor_id, m);
      this.historyMeasurements.push(m);
    });
  }

  private startSimulation() {
    this._intervalId = setInterval(() => {
      this.tick();
    }, 2500);
  }

  private tick() {
    const now = new Date();

    // 1. Update Measurements
    this.devices.forEach((d) => {
      let value = 0;
      const current = this.measurements.get(d.sensor_id)?.measurement_value || 0;

      // Simulation Logic based on Scenario
      if (this._scenario === 'drift' && d.sensor_type === 'cold_storage_temperature') {
        value = current + 0.5; // rising temp
      } else if (this._scenario === 'recovery' && d.sensor_type === 'cold_storage_temperature') {
        value = current > 4 ? current - 1 : 3 + (Math.random() - 0.5); // cooling down
      } else {
        // Normal fluctuation
        const base = this.getBaseValue(d.sensor_type);
        value = base + (Math.random() * 2 - 1); // +/- 1 variance
      }

      const m = this.generateMeasurement(d, now, value);
      this.measurements.set(d.sensor_id, m);
      this.historyMeasurements.push(m);

      // Cleanup history if too big
      if (this.historyMeasurements.length > 2000) {
        this.historyMeasurements.shift();
      }

      // 2. Generate Anomalies
      this.checkAnomaly(d, m);
    });
  }

  private checkAnomaly(d: Device, m: Measurement) {
    let shouldTrigger = false;
    let severity: Severity = 'low';
    let anomalyType = 'positive';

    const chance = Math.random();

    if (
      this._scenario === 'drift' &&
      d.sensor_type === 'cold_storage_temperature' &&
      m.measurement_value > 8
    ) {
      shouldTrigger = true;
      severity = m.measurement_value > 12 ? 'critical' : 'high';
    } else if (this._scenario === 'hygiene' && d.sensor_type === 'handwash' && chance > 0.8) {
      // Simulate missed wash or bad wash
      shouldTrigger = true;
      severity = 'medium';
    } else if (
      this._scenario === 'contamination' &&
      d.sensor_type === 'station_contact' &&
      chance > 0.8
    ) {
      shouldTrigger = true;
      severity = 'high';
    } else if (this._scenario === 'normal' && chance > 0.98) {
      // Occasional random blip
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      const anomaly: Anomaly = {
        id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        measurement_id: m.id,
        sensor_id: d.sensor_id,
        sensor_type: d.sensor_type,
        anomaly: anomalyType,
        severity: severity,
        score: 0.8 + Math.random() * 0.2, // 0.8 - 1.0
        timestamp: m.timestamp,
        store_id: 'store-1',
        zone_id: d.zone_id,
      };
      // Keep only recent 50 anomalies
      this.anomalies.unshift(anomaly);
      if (this.anomalies.length > 50) this.anomalies.pop();
    }
  }

  private resolveAllAnomalies() {
    // In a real app we might verify measurements, here we just clear or mark them.
    // The user requirement says "recovering" state depends on "resolved within last 10 mins".
    // We won't delete them, but UI handles status.
    // Wait, the Mock API endpoint returns anomalies/recent.
    // If we want to simulate recovery, maybe we stop generating them.
    // The UI manages "Open/Resolved". The API just reports raw anomalies detected by the system.
  }

  private generateMeasurement(d: Device, date: Date, val?: number): Measurement {
    return {
      id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sensor_id: d.sensor_id,
      sensor_type: d.sensor_type,
      measurement_type: d.measurement_type,
      measurement_value: val !== undefined ? val : this.getBaseValue(d.sensor_type),
      timestamp: date.toISOString(),
      store_id: 'store-1',
      zone_id: d.zone_id,
    };
  }

  private getBaseValue(type: SensorType): number {
    switch (type) {
      case 'cold_storage_temperature':
        return 3.0; // Celsius
      case 'cook_temp':
        return 75.0;
      case 'dish_wash':
        return 60.0;
      case 'handwash':
        return 1.0; // Event count or binary
      case 'ingredient_flow':
        return 10.0;
      case 'station_contact':
        return 0.0;
      default:
        return 0;
    }
  }

  // --- API Methods ---

  getMeasurementsRecent(): Promise<MeasurementsRecentResponse> {
    return Promise.resolve({
      measurements: Array.from(this.measurements.values()),
    });
  }

  getMeasurementsCount(params: any): Promise<MeasurementsCountResponse> {
    return Promise.resolve({ count: this.historyMeasurements.length });
  }

  getMeasurementsMeasurementType(sensor_id: string): Promise<MeasurementTypeResponse> {
    const d = this.devices.find((x) => x.sensor_id === sensor_id);
    if (!d) return Promise.reject('Sensor not found');
    return Promise.resolve({
      sensor_id: d.sensor_id,
      measurement_type: d.measurement_type,
      sensor_type: d.sensor_type,
    });
  }

  getMeasurementsTimeSeries(params: {
    start?: string;
    end?: string;
    sensor_id?: string;
    granularity?: string;
  }): Promise<TimeSeriesResponse> {
    // Filter history
    let filtered = this.historyMeasurements;
    if (params.sensor_id) filtered = filtered.filter((m) => m.sensor_id === params.sensor_id);

    // Simple bucket logic (return raw points as one bucket for demo)
    const values = filtered.map((m) => ({
      timestamp: m.timestamp,
      measurement_value: m.measurement_value,
    }));
    return Promise.resolve({
      series: [
        { bucket: 'current-session', count: values.length, values: values.slice(-50) }, // Return last 50 for graph/replay
      ],
    });
  }

  getMeasurementsValues(params: {
    limit?: number;
    sensor_id?: string;
  }): Promise<MeasurementsValuesResponse> {
    let filtered = this.historyMeasurements;
    if (params.sensor_id) filtered = filtered.filter((m) => m.sensor_id === params.sensor_id);
    const limit = params.limit || 20;
    return Promise.resolve({
      measurements: filtered.slice(-limit).reverse(),
    });
  }

  getAnomaliesRecent(): Promise<AnomaliesRecentResponse> {
    return Promise.resolve({
      anomalies: [...this.anomalies],
    });
  }

  getAnomaliesAggregate(params: any): Promise<AnomaliesAggregateResponse> {
    return Promise.resolve({ count: this.anomalies.length });
  }

  getAnomaliesBySensor(params: { sensor_id?: string }): Promise<AnomaliesBySensorResponse> {
    let filtered = this.anomalies;
    if (params.sensor_id) filtered = filtered.filter((a) => a.sensor_id === params.sensor_id);

    // Join with measurements (inefficient but fine for mock)
    const results = filtered.map((a) => {
      const m =
        this.historyMeasurements.find((hm) => hm.id === a.measurement_id) ||
        ({ ...a, measurement_value: 0, measurement_type: 'unknown' } as any as Measurement);
      return { anomaly: a, measurement: m };
    });

    return Promise.resolve({ results });
  }

  getAnomaliesTimeSeries(params: any): Promise<TimeSeriesResponse> {
    return Promise.resolve({
      series: [{ bucket: 'today', count: this.anomalies.length }],
    });
  }

  getDevices(): Promise<DevicesResponse> {
    return Promise.resolve({ devices: this.devices });
  }
}
