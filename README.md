# Freshr

Freshr is a real-time food safety monitoring system that detects contamination risk **before food is served**.

It ingests live kitchen sensor data, finds anomalies, links them to root causes, and triggers actionable incidents for operators and engineers.

## **Hosted at:** https://freshr-482201-b6.web.app

## What It Does

- Monitors physical and operational kitchen signals in real time
- Detects hygiene, temperature, and cross-contamination risks
- Links anomalies to specific zones, batches, stations, and shifts
- Produces clear actions: hold, discard, sanitize
- Creates incidents with context in Datadog
- Uses Gemini to explain what happened and what to do next

No predictions. No cameras. Just live signals and fast decisions.

---

## Architecture

- **Confluent (Kafka)** – streaming data in motion
- **Google Cloud Vertex AI / Gemini** – explanations and recommendations
- **Datadog** – observability, SLOs, monitors, incidents
- **Freshr API** – status, anomalies, traceability

Sensors → Streams → Risk → Incident → Action

---

## API (Minimal)

### Ingest

- `POST /ingest`  
  Accepts events and publishes them to Kafka topics.

### Monitoring

- `GET /status/store/{store_id}`
- `GET /status/zone/{zone_id}?start=&end=`
- `GET /anomalies?store_id=&zone_id=&severity=`

### Traceability

- `GET /trace/batch/{batch_id}`

### AI Copilot

- `POST /copilot/query`

### Demo

- `POST /simulate/traffic`

---

## Data Model

- Physical sensor events (temperature, humidity, doors)
- Operational events (handwash, sanitization, glove changes)
- Food handling events (ingredient → station → batch)
- Derived risk events (batch-level safety scores)

All events are streamed, observable, and auditable.

---

## Observability

Datadog dashboards show:

- Kitchen health
- Risk levels by zone and batch
- Active alerts and incidents
- LLM latency, errors, and cost

Detection rules automatically create actionable incidents.

---

## Demo Mode

Includes a simulator that generates:

- Normal operations
- Hygiene failures
- Temperature drift
- Cross-contamination scenarios
- Recovery events

Used to trigger monitors live.

---

## Why Freshr

Food safety failures are detected too late.

Freshr catches them in real time.

---

## License

MIT License
