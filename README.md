# Freshr

Food safety, powered by data in motion.

Freshr uses real-time streaming sensor data and AI to detect food safety risks in kitchen before they reach guests.

Freshr is a real-time food safety monitoring system that detects kitchen risks before they reach guests. Using streaming sensor data powered by Confluent and AI-assisted anomaly detection on Google Cloud, Freshr transforms live kitchen telemetry into actionable safety insights. The system demonstrates how AI on data in motion can enable proactive intervention, improve compliance, and reduce the risk of foodborne incidents in commercial kitchens.

---

## Architecture

Sensors → Kafka (Confluent) → Processor → Firestore → API → Web UI

**Tech stack**

- Kafka / Confluent
- Google Cloud Run
- Google Firestore
- Angular + Firebase Hosting
- Datadog (WIP)
- Gemini / Vertex AI (WIP)

---

## Backend

### Sensor Model

**Physical sensors**

- cold_storage_temperature
- ambient_kitchen_temperature
- humidity
- time_out_of_range_duration

**Operational sensors**

- handwash_station_usage
- delivery_arrival
- shift_change

Each sensor type publishes to its own Kafka topic:

- `sensor-physical-*`
- `sensor-operational-*`

All processed events are forwarded to:

- `sensor-events-processed`

Schemas live in:

```

src/datastream/schemas/

```

---

### Local Setup

```

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pip install -r requirements.txt

```

---

### Checks (tests, format, lint)

```

./scripts/run_checks.sh

```

---

### Cloud Build & Deploy

Build and push images:

```

./scripts/build_cloud.sh
./scripts/build_cloud.sh --api-only

```

Set Kafka environment variables:

```

export KAFKA_BOOTSTRAP=<cluster>.confluent.cloud:9092
export KAFKA_SECURITY_PROTOCOL=SASL_SSL
export KAFKA_SASL_MECHANISM=PLAIN
export KAFKA_SASL_USERNAME=<API_KEY>
export KAFKA_SASL_PASSWORD=<API_SECRET>

```

Deploy services:

```
source .env
./scripts/deploy_cloud_run.sh
./scripts/deploy_cloud_run.sh --api-only

```

Tear down services:

```

./scripts/delete_cloud_run.sh
./scripts/delete_cloud_run.sh --skip-api

```

Producer, consumer, and processor run as long-lived services with a `/healthz` endpoint.

---

### Backend Behavior

- Consumer writes raw events to `device_measurements`
- Processor flags anomalies and writes to `anomalies`
- Measurement documents are annotated with anomaly metadata
- Designed for continuous workloads (Cloud Run with min instances > 0 or GKE)

---

### API (Cloud Run)

**Measurements**

```

GET /measurements/recent

```

**Anomalies**

```

GET /anomalies/recent

```

Example:

```

curl [https://dynamap-api-lfc277t73a-uc.a.run.app/measurements/recent](https://dynamap-api-lfc277t73a-uc.a.run.app/measurements/recent)
curl [https://dynamap-api-lfc277t73a-uc.a.run.app/anomalies/recent](https://dynamap-api-lfc277t73a-uc.a.run.app/anomalies/recent)

```

Additional API documentation:

```

src/api/README.md

```

---

## Frontend

Hosted at:

```

[https://freshr-482201-b6.web.app](https://freshr-482201-b6.web.app)

```

### Setup

Requires `pnpm`.

```

pnpm install
ng build
ng serve

```

Deploy:

```

firebase deploy

```

---

### UI Features

- Kitchen and zone health
- Recent sensor data
- Active anomalies
- Incident context (when enabled)
- Simulated demo events

---

### Demo / Simulation

The simulator can generate:

- Normal operations
- Hygiene failures
- Temperature drift
- Cross-contamination scenarios
- Recovery events

Used to trigger monitors and anomalies in real time.

---

## License

MIT License

```

```
