# dynamap
Project for AI Partner for Catalyst

## TODO (remove afterwards)
- Switch from local Kafka to Confluent Cloud for productionizattion
```bash
Producer({
  "bootstrap.servers": "kafka:9092"
})
```
- Deploy all components to production + stream line this so that it is seamless
```bash
Producer({
  "bootstrap.servers": "<cluster>.confluent.cloud:9092",
  "security.protocol": "SASL_SSL",
  "sasl.mechanism": "PLAIN",
  "sasl.username": "<API_KEY>",
  "sasl.password": "<API_SECRET>"
})
```

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

## Data stream stack (Kafka + Firestore)
- Components: producer (writes `price-events`), consumer (writes to Firestore), processing API (reads from Firestore).
- Configure `.env` with your settings (not committed):
  ```
  KAFKA_BOOTSTRAP=<cluster>.confluent.cloud:9092
  KAFKA_SECURITY_PROTOCOL=SASL_SSL
  KAFKA_SASL_MECHANISM=PLAIN
  KAFKA_SASL_USERNAME=<API_KEY>
  KAFKA_SASL_PASSWORD=<API_SECRET>
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  ```
- Build and run N producers, consumers, processors (defaults: 5/1/2):
  ```bash
  ./scripts/run_stack.sh
  ```

### Backend deployment note
- Long-running pieces (producer/consumer) stay containerized; deploy to a service suited for continuous workloads (e.g., GKE or managed Kafka connectors).
- On-demand HTTP (processing API) can stay containerized and run on Cloud Run behind HTTPS; still uses Firestore and Kafka data.
- Google tech in use: Firestore via `google-cloud-firestore`; Kafka client is `confluent-kafka` configured with Confluent Cloud SASL/SSL at runtime.
