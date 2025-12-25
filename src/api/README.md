# API endpoints

Base URL (Cloud Run example): `https://dynamap-api-lfc277t73a-uc.a.run.app`

## Measurements
- Recent per sensor (most recent per `sensor_id`):
  ```bash
  curl "$BASE/measurements/recent"
  ```
  Response: `{"measurements":[{...}]}` (one per sensor_id)

- Measurements count in time window (optionally filtered by sensor_id or sensor_type):
  ```bash
  curl "$BASE/measurements/count?start=2025-12-20T00:00:00Z&end=2025-12-25T00:00:00Z"
  curl "$BASE/measurements/count?start=2025-12-20T00:00:00Z&end=2025-12-25T00:00:00Z&sensor_id=cs-1"
  curl "$BASE/measurements/count?start=2025-12-20T00:00:00Z&end=2025-12-25T00:00:00Z&sensor_type=humidity"
  ```
  Response: `{"count": <int>}`

- Measurement type for a sensor_id:
  ```bash
  curl "$BASE/measurements/measurement-type?sensor_id=cs-1"
  ```
  Response: `{"sensor_id":"cs-1","measurement_type":"celsius","sensor_type":"cold_storage_temperature"}`

- Measurements time series (counts; optional filters and granularity: day/hour/minute/week):
  ```bash
  curl "$BASE/measurements/time-series?start=2025-12-20T00:00:00Z&end=2025-12-25T00:00:00Z"
  curl "$BASE/measurements/time-series?sensor_id=cs-1"
  curl "$BASE/measurements/time-series?sensor_type=humidity"
  curl "$BASE/measurements/time-series?granularity=hour"
  curl "$BASE/measurements/time-series?granularity=week"
  ```
  Response: `{"series":[{"bucket":"2025-12-20","count":10,"values":[{"timestamp":"...","measurement_value":...}, ...]}, ...]}`

- Measurements values (optional filters; returns documents):
  ```bash
  curl "$BASE/measurements/values?start=2025-12-20T00:00:00Z&end=2025-12-25T00:00:00Z"
  curl "$BASE/measurements/values?sensor_id=cs-1&limit=50"
  curl "$BASE/measurements/values?sensor_type=humidity"
  ```
  Response: `{"measurements":[{"id":"m1",...}, ...]}`

## Anomalies
- Recent anomalies (most recent per measurement_id):
  ```bash
  curl "$BASE/anomalies/recent"
  ```
  Response: `{"anomalies":[{...}]}`

- Anomalies aggregated (total count, optional sensor filter):
  ```bash
  curl "$BASE/anomalies/aggregate"
  curl "$BASE/anomalies/aggregate?sensor_type=cold_storage_temperature"
  curl "$BASE/anomalies/aggregate?sensor_id=cs-1"
  curl "$BASE/anomalies/aggregate?anomaly=positive"
  ```
  Response: `{"count": <int>}`

- Anomaly lookup joined with measurement (by sensor_id or all):
  ```bash
  curl "$BASE/anomalies/by-sensor?sensor_id=cs-1"
  curl "$BASE/anomalies/by-sensor"   # all sensors
  ```
  Response: `{"results":[{"anomaly":{...},"measurement":{...}}]}`

- Anomalies time series (counts; optional filters and granularity: day/hour/minute/week):
  ```bash
  curl "$BASE/anomalies/time-series?start=2025-12-20T00:00:00Z&end=2025-12-25T00:00:00Z"
  curl "$BASE/anomalies/time-series?sensor_id=cs-1"
  curl "$BASE/anomalies/time-series?sensor_type=humidity"
  curl "$BASE/anomalies/time-series?anomaly=positive"
  curl "$BASE/anomalies/time-series?granularity=hour"
  curl "$BASE/anomalies/time-series?granularity=week"
  ```
  Response: `{"series":[{"bucket":"2025-12-20","count":10}, ...]}`

## Inventory
- List devices/sensors and their types:
  ```bash
  curl "$BASE/devices"
  ```
  Response: `{"devices":[{"sensor_id":"cs-1","sensor_type":"cold_storage_temperature","measurement_type":"celsius"}]}`
