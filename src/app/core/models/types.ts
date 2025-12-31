export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type SensorType =
  | 'cold_storage_temperature'
  | 'handwash'
  | 'ingredient_flow'
  | 'station_contact'
  | 'cook_temp'
  | 'dish_wash';
export type Granularity = 'day' | 'hour' | 'min' | 'week';
export type ZoneState = 'normal' | 'at-risk' | 'unsafe' | 'recovering';

export interface Measurement {
  id: string;
  sensor_id: string;
  sensor_type: SensorType;
  measurement_type: string;
  measurement_value: number;
  timestamp: string;
  store_id: string;
  zone_id: string;
}

export interface Anomaly {
  id: string;
  measurement_id: string;
  sensor_id: string;
  sensor_type: SensorType;
  anomaly: string; // 'positive'
  severity: Severity;
  score: number;
  timestamp: string;
  store_id: string;
  zone_id: string;
}

export interface Device {
  sensor_id: string;
  sensor_type: SensorType;
  measurement_type: string;
  zone_id: string; // Added for easier mapping
  zone_name?: string;
}

export interface Zone {
  id: string;
  name: string;
}

// API Response Shapes
export interface MeasurementsRecentResponse {
  measurements: Measurement[];
}

export interface MeasurementsCountResponse {
  count: number;
}

export interface MeasurementTypeResponse {
  sensor_id: string;
  measurement_type: string;
  sensor_type: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  measurement_value: number;
}

export interface TimeSeriesBucket {
  bucket: string;
  count: number;
  values?: TimeSeriesPoint[];
}

export interface TimeSeriesResponse {
  series: TimeSeriesBucket[];
}

export interface MeasurementsValuesResponse {
  measurements: Measurement[];
}

export interface AnomaliesRecentResponse {
  anomalies: Anomaly[];
}

export interface AnomaliesAggregateResponse {
  count: number;
}

export interface AnomalyResult {
  anomaly: Anomaly;
  measurement: Measurement;
}

export interface AnomaliesBySensorResponse {
  results: AnomalyResult[];
}

export interface DevicesResponse {
  devices: Device[];
}

export interface IncidentAlert {
  anomaly: Anomaly;
  measurement: Measurement | null;
  status: IncidentStatus;
  requiredAction: string;
  zone_name: string;
}

export interface Incident {
  id: string;
  type: 'temperature_drift' | 'hygiene_failure' | 'cross_contamination' | 'time_violation';
  title: string;
  severity: 'critical' | 'warning' | 'info';
  zones: string[];
  timestamp: string;
  sensors: string[];
  actions: string[];
  measurements: Measurement[];
}

export type IncidentStatus = 'Open' | 'Acknowledged' | 'Resolved';
