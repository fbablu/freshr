# dynamap
Project for AI Partner for Catalyst

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
- Deploy all services to Cloud Run (set Kafka envs first; you can source `.env` if you have one):
  ```bash
  # If you have .env populated:
  source .env
  # Or export manually:
  # export KAFKA_BOOTSTRAP=<cluster>.confluent.cloud:9092
  # export KAFKA_SECURITY_PROTOCOL=SASL_SSL
  # export KAFKA_SASL_MECHANISM=PLAIN
  # export KAFKA_SASL_USERNAME=<API_KEY>
  # export KAFKA_SASL_PASSWORD=<API_SECRET>
  # export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json  # if not using ADC
  ./scripts/deploy_cloud_run.sh
  ```
- Execute streaming jobs:
  ```bash
  ./scripts/run_jobs_cloud.sh
  ```
- Tear down Cloud Run services:
  ```bash
  ./scripts/delete_cloud_run.sh
  ```

## API access (Cloud Run)
- Scores endpoint: `https://dynamap-api-lfc277t73a-uc.a.run.app/scores/recent`
- Example:
  ```bash
  curl https://dynamap-api-lfc277t73a-uc.a.run.app/scores/recent
  ```
  Returns JSON of the most recent score per store (empty if no scores yet).

### Backend deployment note
- Long-running pieces (producer/consumer/processor) stay containerized; deploy to a service suited for continuous workloads (e.g., Cloud Run with min instances >0, or GKE).
- On-demand HTTP (processing API) can stay containerized and run on Cloud Run behind HTTPS; still uses Firestore and Kafka data.
- Scaling on Cloud Run is handled per service; adjust `--min-instances`/`--max-instances` in the deploy script as needed.
- Google tech in use: Firestore via `google-cloud-firestore`; Kafka client is `confluent-kafka` configured with Confluent Cloud SASL/SSL at runtime.
