#!/usr/bin/env bash
set -euo pipefail

# Delete Cloud Run services to stop all containers.

PROJECT="rich-archery-482201-b6"
REGION="us-central1"

for svc in dynamap-producer dynamap-consumer dynamap-processing dynamap-api; do
  gcloud run services delete "$svc" --project "$PROJECT" --region "$REGION" --quiet
done
