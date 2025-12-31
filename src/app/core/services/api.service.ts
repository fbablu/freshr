import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnomaliesAggregateResponse,
  AnomaliesBySensorResponse,
  AnomaliesRecentResponse,
  MeasurementsCountResponse,
  MeasurementsRecentResponse,
  MeasurementTypeResponse,
  MeasurementsValuesResponse,
  TimeSeriesResponse,
  DevicesResponse,
} from '../models/types';

// New types for copilot and social endpoints
export interface AIExplanation {
  what_happened: string;
  why_it_matters: string;
  what_to_do: string[];
  confirm_recovery: string;
}

export interface CopilotExplainResponse {
  explanation: AIExplanation;
  source: 'gemini' | 'fallback';
  anomaly_id?: string;
}

export interface SocialSignal {
  id: string;
  platform: 'twitter' | 'yelp';
  author: string;
  content: string;
  timestamp: string;
  relative_time: string;
  sentiment: string;
  keywords: string[];
  severity: string;
  rating?: number;
}

export interface SocialSignalsResponse {
  signals: SocialSignal[];
  scenario: string;
  count: number;
}

export interface TimelineEvent {
  type: 'social' | 'anomaly';
  source: string;
  content: string;
  severity: string;
  timestamp: string;
}

export interface SocialTimelineResponse {
  timeline: TimelineEvent[];
  scenario: string;
}

export interface CorrelationResponse {
  correlation: {
    anomaly_detection_time: string;
    first_social_signal: string;
    public_health_alert: string;
    freshr_advantage: string;
    potential_cases_prevented: string;
  } | null;
  insight?: string;
  message?: string;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
}

export interface ScenariosResponse {
  scenarios: ScenarioInfo[];
}

export interface SeedResponse {
  scenario: string;
  created: {
    measurements: number;
    anomalies: number;
  };
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Measurements endpoints
  getMeasurementsRecent(): Promise<MeasurementsRecentResponse> {
    return firstValueFrom(
      this.http.get<MeasurementsRecentResponse>(`${this.baseUrl}/measurements/recent`),
    );
  }

  getMeasurementsCount(params?: any): Promise<MeasurementsCountResponse> {
    const httpParams = this.buildHttpParams(params);
    return firstValueFrom(
      this.http.get<MeasurementsCountResponse>(`${this.baseUrl}/measurements/count`, {
        params: httpParams,
      }),
    );
  }

  getMeasurementsMeasurementType(sensor_id: string): Promise<MeasurementTypeResponse> {
    return firstValueFrom(
      this.http.get<MeasurementTypeResponse>(
        `${this.baseUrl}/measurements/measurement_type/${sensor_id}`,
      ),
    );
  }

  getMeasurementsTimeSeries(params: {
    start?: string;
    end?: string;
    sensor_id?: string;
    granularity?: string;
  }): Promise<TimeSeriesResponse> {
    const httpParams = this.buildHttpParams(params);
    return firstValueFrom(
      this.http.get<TimeSeriesResponse>(`${this.baseUrl}/measurements/time_series`, {
        params: httpParams,
      }),
    );
  }

  getMeasurementsValues(params: {
    limit?: number;
    sensor_id?: string;
  }): Promise<MeasurementsValuesResponse> {
    const httpParams = this.buildHttpParams(params);
    return firstValueFrom(
      this.http.get<MeasurementsValuesResponse>(`${this.baseUrl}/measurements/values`, {
        params: httpParams,
      }),
    );
  }

  // Anomalies endpoints
  getAnomaliesRecent(): Promise<AnomaliesRecentResponse> {
    return firstValueFrom(
      this.http.get<AnomaliesRecentResponse>(`${this.baseUrl}/anomalies/recent`),
    );
  }

  getAnomaliesAggregate(params?: any): Promise<AnomaliesAggregateResponse> {
    const httpParams = this.buildHttpParams(params);
    return firstValueFrom(
      this.http.get<AnomaliesAggregateResponse>(`${this.baseUrl}/anomalies/aggregate`, {
        params: httpParams,
      }),
    );
  }

  getAnomaliesBySensor(params: { sensor_id?: string }): Promise<AnomaliesBySensorResponse> {
    const httpParams = this.buildHttpParams(params);
    return firstValueFrom(
      this.http.get<AnomaliesBySensorResponse>(`${this.baseUrl}/anomalies/by_sensor`, {
        params: httpParams,
      }),
    );
  }

  getAnomaliesTimeSeries(params?: any): Promise<TimeSeriesResponse> {
    const httpParams = this.buildHttpParams(params);
    return firstValueFrom(
      this.http.get<TimeSeriesResponse>(`${this.baseUrl}/anomalies/time_series`, {
        params: httpParams,
      }),
    );
  }

  // Devices endpoint
  getDevices(): Promise<DevicesResponse> {
    return firstValueFrom(this.http.get<DevicesResponse>(`${this.baseUrl}/devices`));
  }

  // ============ NEW ENDPOINTS ============

  // Copilot / AI Explanation
  getCopilotExplanation(data: {
    anomaly_id?: string;
    sensor_type: string;
    measurement_value?: number;
    measurement_type?: string;
    zone_id?: string;
    severity?: string;
    timestamp?: string;
  }): Promise<CopilotExplainResponse> {
    return firstValueFrom(
      this.http.post<CopilotExplainResponse>(`${this.baseUrl}/copilot/explain`, data),
    );
  }

  getCopilotExplanationById(anomalyId: string): Promise<CopilotExplainResponse> {
    return firstValueFrom(
      this.http.get<CopilotExplainResponse>(`${this.baseUrl}/copilot/explain/${anomalyId}`),
    );
  }

  // Social Signals
  getSocialSignals(scenario: string = 'ecoli', limit: number = 10): Promise<SocialSignalsResponse> {
    const params = this.buildHttpParams({ scenario, limit });
    return firstValueFrom(
      this.http.get<SocialSignalsResponse>(`${this.baseUrl}/social/signals`, { params }),
    );
  }

  getSocialTimeline(scenario: string = 'ecoli'): Promise<SocialTimelineResponse> {
    const params = this.buildHttpParams({ scenario });
    return firstValueFrom(
      this.http.get<SocialTimelineResponse>(`${this.baseUrl}/social/timeline`, { params }),
    );
  }

  getSocialCorrelation(scenario: string = 'ecoli'): Promise<CorrelationResponse> {
    const params = this.buildHttpParams({ scenario });
    return firstValueFrom(
      this.http.get<CorrelationResponse>(`${this.baseUrl}/social/correlation`, { params }),
    );
  }

  // Scenarios & Seeding
  getScenarios(): Promise<ScenariosResponse> {
    return firstValueFrom(this.http.get<ScenariosResponse>(`${this.baseUrl}/scenarios`));
  }

  seedScenario(scenario: string, clear: boolean = true): Promise<SeedResponse> {
    const params = this.buildHttpParams({ scenario, clear: clear.toString() });
    return firstValueFrom(this.http.post<SeedResponse>(`${this.baseUrl}/seed`, null, { params }));
  }

  clearData(): Promise<{ cleared: boolean }> {
    return firstValueFrom(this.http.post<{ cleared: boolean }>(`${this.baseUrl}/seed/clear`, null));
  }

  // Helper method to build HTTP params
  private buildHttpParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return httpParams;
  }
}
