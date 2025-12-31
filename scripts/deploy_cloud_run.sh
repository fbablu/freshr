#!/usr/bin/env bash
set -euo pipefail

PROJECT="rich-archery-482201-b6"
REGION="us-central1"
REPO="freshr"
API_ONLY=false

if [ "${1:-}" = "--api-only" ]; then
  API_ONLY=true
fi

# Required Kafka env vars
: "${KAFKA_BOOTSTRAP:?Set KAFKA_BOOTSTRAP}"
: "${KAFKA_SECURITY_PROTOCOL:?Set KAFKA_SECURITY_PROTOCOL}"
: "${KAFKA_SASL_MECHANISM:?Set KAFKA_SASL_MECHANISM}"
: "${KAFKA_SASL_USERNAME:?Set KAFKA_SASL_USERNAME}"
: "${KAFKA_SASL_PASSWORD:?Set KAFKA_SASL_PASSWORD}"

PRODUCER_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/freshr-producer"
CONSUMER_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/freshr-consumer"
PROCESSING_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/freshr-processing"
API_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/freshr-api"

if [ "$API_ONLY" != "true" ]; then
  echo "Deploying PROCESSOR as Cloud Run SERVICE"
  gcloud run deploy freshr-processing \
    --project "$PROJECT" \
    --region "$REGION" \
    --image "$PROCESSING_IMAGE" \
    --allow-unauthenticated \
    --set-env-vars KAFKA_BOOTSTRAP="$KAFKA_BOOTSTRAP",KAFKA_SECURITY_PROTOCOL="$KAFKA_SECURITY_PROTOCOL",KAFKA_SASL_MECHANISM="$KAFKA_SASL_MECHANISM",KAFKA_SASL_USERNAME="$KAFKA_SASL_USERNAME",KAFKA_SASL_PASSWORD="$KAFKA_SASL_PASSWORD",PROCESSED_TOPIC=sensor-events-processed,DEVICE_COLLECTION=device_measurements,ANOMALIES_COLLECTION=anomalies \
    --min-instances=1

  echo "Deploying CONSUMER as Cloud Run SERVICE"
  gcloud run deploy freshr-consumer \
    --project "$PROJECT" \
    --region "$REGION" \
    --image "$CONSUMER_IMAGE" \
    --allow-unauthenticated \
    --set-env-vars KAFKA_BOOTSTRAP="$KAFKA_BOOTSTRAP",KAFKA_SECURITY_PROTOCOL="$KAFKA_SECURITY_PROTOCOL",KAFKA_SASL_MECHANISM="$KAFKA_SASL_MECHANISM",KAFKA_SASL_USERNAME="$KAFKA_SASL_USERNAME",KAFKA_SASL_PASSWORD="$KAFKA_SASL_PASSWORD",PROCESSED_TOPIC=sensor-events-processed,DEVICE_COLLECTION=device_measurements \
    --min-instances=1

  echo "Deploying PRODUCER as Cloud Run SERVICE"
  gcloud run deploy freshr-producer \
    --project "$PROJECT" \
    --region "$REGION" \
    --image "$PRODUCER_IMAGE" \
    --allow-unauthenticated \
    --set-env-vars KAFKA_BOOTSTRAP="$KAFKA_BOOTSTRAP",KAFKA_SECURITY_PROTOCOL="$KAFKA_SECURITY_PROTOCOL",KAFKA_SASL_MECHANISM="$KAFKA_SASL_MECHANISM",KAFKA_SASL_USERNAME="$KAFKA_SASL_USERNAME",KAFKA_SASL_PASSWORD="$KAFKA_SASL_PASSWORD" \
    --min-instances=1
else
  echo "API-only deploy selected; skipping producer/consumer/processor"
fi

echo "Deploying API SERVICE (HTTP)"
gcloud run deploy freshr-api \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$API_IMAGE" \
  --allow-unauthenticated \
  --set-env-vars \
    DEVICE_COLLECTION=device_measurements,ANOMALIES_COLLECTION=anomalies,GOOGLE_CLOUD_PROJECT=rich-archery-482201-b6,VERTEX_REGION=us-central1
