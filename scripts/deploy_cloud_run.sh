#!/usr/bin/env bash
set -euo pipefail

# Deploy all services to Cloud Run using images in Artifact Registry.
# Requires: images already built/pushed, `gcloud run` configured, and env vars set below.

PROJECT="rich-archery-482201"
REGION="us-central1"
REPO="dynamap"

# Kafka / Confluent settings (required)
: "${KAFKA_BOOTSTRAP:?Set KAFKA_BOOTSTRAP}"
: "${KAFKA_SECURITY_PROTOCOL:?Set KAFKA_SECURITY_PROTOCOL}"
: "${KAFKA_SASL_MECHANISM:?Set KAFKA_SASL_MECHANISM}"
: "${KAFKA_SASL_USERNAME:?Set KAFKA_SASL_USERNAME}"
: "${KAFKA_SASL_PASSWORD:?Set KAFKA_SASL_PASSWORD}"

# Firestore credentials: use ADC (Workload Identity) or set GOOGLE_APPLICATION_CREDENTIALS.

gcloud run deploy dynamap-producer \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-producer" \
  --set-env-vars KAFKA_BOOTSTRAP="$KAFKA_BOOTSTRAP",KAFKA_SECURITY_PROTOCOL="$KAFKA_SECURITY_PROTOCOL",KAFKA_SASL_MECHANISM="$KAFKA_SASL_MECHANISM",KAFKA_SASL_USERNAME="$KAFKA_SASL_USERNAME",KAFKA_SASL_PASSWORD="$KAFKA_SASL_PASSWORD" \
  --platform managed

gcloud run deploy dynamap-consumer \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-consumer" \
  --set-env-vars KAFKA_BOOTSTRAP="$KAFKA_BOOTSTRAP",KAFKA_SECURITY_PROTOCOL="$KAFKA_SECURITY_PROTOCOL",KAFKA_SASL_MECHANISM="$KAFKA_SASL_MECHANISM",KAFKA_SASL_USERNAME="$KAFKA_SASL_USERNAME",KAFKA_SASL_PASSWORD="$KAFKA_SASL_PASSWORD",PROCESSED_TOPIC=price-events-processed \
  --platform managed

gcloud run deploy dynamap-processing \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-processing" \
  --set-env-vars KAFKA_BOOTSTRAP="$KAFKA_BOOTSTRAP",KAFKA_SECURITY_PROTOCOL="$KAFKA_SECURITY_PROTOCOL",KAFKA_SASL_MECHANISM="$KAFKA_SASL_MECHANISM",KAFKA_SASL_USERNAME="$KAFKA_SASL_USERNAME",KAFKA_SASL_PASSWORD="$KAFKA_SASL_PASSWORD",PROCESSED_TOPIC=price-events-processed,SCORES_COLLECTION=scores \
  --platform managed

gcloud run deploy dynamap-api \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-api" \
  --set-env-vars SCORES_COLLECTION=scores \
  --platform managed
