#!/usr/bin/env bash
set -euo pipefail

PROJECT="rich-archery-482201-b6"
REGION="us-central1"

echo "Executing PRODUCER job"
gcloud run jobs execute dynamap-producer \
  --project "$PROJECT" \
  --region "$REGION"

echo "Executing CONSUMER job"
gcloud run jobs execute dynamap-consumer \
  --project "$PROJECT" \
  --region "$REGION"

echo "Executing PROCESSOR job"
gcloud run jobs execute dynamap-processing \
  --project "$PROJECT" \
  --region "$REGION"

echo "All jobs triggered successfully"