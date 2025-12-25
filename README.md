# dynamap
Sensor streaming demo (physical + operational) with Kafka/Confluent, Firestore, and Cloud Run.

## Local setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # includes pytest, ruff, black
pip install -r requirements.txt
```

## Checks (tests, format, lint)
```bash
./scripts/run_checks.sh
```

## Cloud build/deploy scripts
- Build and push images to Artifact Registry:
  ```bash
  ./scripts/build_cloud.sh
  ./scripts/build_cloud.sh --api-only   # build/push only the API image
  ```
- Deploy all services to Cloud Run (set Kafka envs first; you can source `.env` if you have one). Producer/consumer/processor now run as long-lived services with a /healthz endpoint:
  ```bash
  # If you have .env populated:
  source .env
  # Or export manually:
  # export KAFKA_BOOTSTRAP=<cluster>.confluent.cloud:9092
  # export KAFKA_SECURITY_PROTOCOL=SASL_SSL
  # export KAFKA_SASL_MECHANISM=PLAIN
  # export KAFKA_SASL_USERNAME=<API_KEY>
  # export KAFKA_SASL_PASSWORD=<API_SECRET>
  # (Ensure these are set for all services before deploy; otherwise Kafka will fail)
  # export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json  # if not using ADC
  ./scripts/deploy_cloud_run.sh
  # API-only redeploy:
  ./scripts/deploy_cloud_run.sh --api-only
  ```
- Tear down Cloud Run services:
  ```bash
  ./scripts/delete_cloud_run.sh              # deletes all services
  ./scripts/delete_cloud_run.sh --skip-api   # leaves API running
  ```

## Sensor model
- Physical sensors: cold_storage_temperature, ambient_kitchen_temperature, humidity, time_out_of_range_duration
- Operational sensors: handwash_station_usage, delivery_arrival, shift_change
- Each sensor type has its own Kafka topic (`sensor-physical-*`, `sensor-operational-*`); all processed events are forwarded to `sensor-events-processed`.
- Consumer writes all raw events to Firestore collection `device_measurements`.
- Processor reads `sensor-events-processed`, flags anomalies (mocked for physical sensors), writes `anomalies` collection, and annotates measurement docs.
- Schemas for all topics live in `src/datastream/schemas/` (copy into Schema Registry as needed).

## API access (Cloud Run)
- Measurements endpoint: `https://dynamap-api-lfc277t73a-uc.a.run.app/measurements/recent`
- Anomalies endpoint: `https://dynamap-api-lfc277t73a-uc.a.run.app/anomalies/recent`
- Example:
  ```bash
  curl https://dynamap-api-lfc277t73a-uc.a.run.app/measurements/recent
  curl https://dynamap-api-lfc277t73a-uc.a.run.app/anomalies/recent
  ```
  Returns JSON of the most recent entries (empty if none).

  Additional-  API docs/examples: see `src/api/README.md`

### Backend deployment note
- Long-running pieces (producer/consumer/processor) stay containerized; deploy to a service suited for continuous workloads (e.g., Cloud Run with min instances >0, or GKE).
- On-demand HTTP (processing API) can stay containerized and run on Cloud Run behind HTTPS; still uses Firestore and Kafka data.
- Scaling on Cloud Run is handled per service; adjust `--min-instances`/`--max-instances` in the deploy script as needed.
- Google tech in use: Firestore via `google-cloud-firestore`; Kafka client is `confluent-kafka` configured with Confluent Cloud SASL/SSL at runtime.
