#!/usr/bin/env bash
set -euo pipefail

PROJECT="rich-archery-482201-b6"
REGION="us-central1"
SKIP_API=false

if [ "${1:-}" = "--skip-api" ]; then
  SKIP_API=true
fi

echo "Deleting Cloud Run SERVICES"
for svc in dynamap-producer dynamap-consumer dynamap-processing; do
  gcloud run services delete "$svc" \
    --project "$PROJECT" \
    --region "$REGION" \
    --quiet || true
done

if [ "$SKIP_API" != "true" ]; then
  gcloud run services delete dynamap-api \
    --project "$PROJECT" \
    --region "$REGION" \
    --quiet || true
else
  echo "Skipping API deletion (SKIP_API=true)"
fi

echo "All Cloud Run services deleted"

echo "All Cloud Run resources deleted"
