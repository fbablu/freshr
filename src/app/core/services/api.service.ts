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
