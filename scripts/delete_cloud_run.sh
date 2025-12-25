#!/usr/bin/env bash
set -euo pipefail

PROJECT="rich-archery-482201-b6"
REGION="us-central1"

echo "Deleting Cloud Run SERVICES"
for svc in dynamap-api dynamap-producer dynamap-consumer dynamap-processing; do
  gcloud run services delete "$svc" \
    --project "$PROJECT" \
    --region "$REGION" \
    --quiet || true
done

echo "All Cloud Run services deleted"

echo "All Cloud Run resources deleted"
