#!/usr/bin/env bash
set -euo pipefail

PROJECT="rich-archery-482201-b6"
REGION="us-central1"
REPO="dynamap"

# Required Kafka env vars
: "${KAFKA_BOOTSTRAP:?Set KAFKA_BOOTSTRAP}"
: "${KAFKA_SECURITY_PROTOCOL:?Set KAFKA_SECURITY_PROTOCOL}"
: "${KAFKA_SASL_MECHANISM:?Set KAFKA_SASL_MECHANISM}"
: "${KAFKA_SASL_USERNAME:?Set KAFKA_SASL_USERNAME}"
: "${KAFKA_SASL_PASSWORD:?Set KAFKA_SASL_PASSWORD}"

PRODUCER_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-producer"
CONSUMER_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-consumer"
PROCESSING_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-processing"
API_IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/dynamap-api"

echo "Deploying PRODUCER as Cloud Run JOB"
gcloud run jobs create dynamap-producer \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$PRODUCER_IMAGE" \
  --set-env-vars "KAFKA_BOOTSTRAP=$KAFKA_BOOTSTRAP,KAFKA_SECURITY_PROTOCOL=$KAFKA_SECURITY_PROTOCOL,KAFKA_SASL_MECHANISM=$KAFKA_SASL_MECHANISM,KAFKA_SASL_USERNAME=$KAFKA_SASL_USERNAME,KAFKA_SASL_PASSWORD=$KAFKA_SASL_PASSWORD" \
  --max-retries=0 || true

echo "Deploying CONSUMER as Cloud Run JOB"
gcloud run jobs create dynamap-consumer \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$CONSUMER_IMAGE" \
  --set-env-vars "KAFKA_BOOTSTRAP=$KAFKA_BOOTSTRAP,KAFKA_SECURITY_PROTOCOL=$KAFKA_SECURITY_PROTOCOL,KAFKA_SASL_MECHANISM=$KAFKA_SASL_MECHANISM,KAFKA_SASL_USERNAME=$KAFKA_SASL_USERNAME,KAFKA_SASL_PASSWORD=$KAFKA_SASL_PASSWORD,PROCESSED_TOPIC=price-events-processed" \
  --max-retries=0 || true

echo "Deploying PROCESSOR as Cloud Run JOB"
gcloud run jobs create dynamap-processing \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$PROCESSING_IMAGE" \
  --set-env-vars "KAFKA_BOOTSTRAP=$KAFKA_BOOTSTRAP,KAFKA_SECURITY_PROTOCOL=$KAFKA_SECURITY_PROTOCOL,KAFKA_SASL_MECHANISM=$KAFKA_SASL_MECHANISM,KAFKA_SASL_USERNAME=$KAFKA_SASL_USERNAME,KAFKA_SASL_PASSWORD=$KAFKA_SASL_PASSWORD,PROCESSED_TOPIC=price-events-processed,SCORES_COLLECTION=scores" \
  --max-retries=0 || true

echo "Deploying API SERVICE (HTTP)"
gcloud run deploy dynamap-api \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$API_IMAGE" \
  --allow-unauthenticated \
  --set-env-vars \
    SCORES_COLLECTION=scores