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

## Cloud build/deploy scripts
- Build and push images to Artifact Registry:
  ```bash
  ./scripts/build_cloud.sh
  ```
- Deploy all services to Cloud Run (set Kafka envs first):
  ```bash
  export KAFKA_BOOTSTRAP=...
  export KAFKA_SECURITY_PROTOCOL=SASL_SSL
  export KAFKA_SASL_MECHANISM=PLAIN
  export KAFKA_SASL_USERNAME=...
  export KAFKA_SASL_PASSWORD=...
  ./scripts/deploy_cloud_run.sh
  ```
- Tear down Cloud Run services:
  ```bash
  ./scripts/delete_cloud_run.sh
  ```

### Backend deployment note
- Long-running pieces (producer/consumer/processor) stay containerized; deploy to a service suited for continuous workloads (e.g., Cloud Run with min instances >0, or GKE).
- On-demand HTTP (processing API) can stay containerized and run on Cloud Run behind HTTPS; still uses Firestore and Kafka data.
- Scaling on Cloud Run is handled per service; adjust `--min-instances`/`--max-instances` in the deploy script as needed.
- Google tech in use: Firestore via `google-cloud-firestore`; Kafka client is `confluent-kafka` configured with Confluent Cloud SASL/SSL at runtime.
