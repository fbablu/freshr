#!/usr/bin/env bash
set -euo pipefail

# Spin up multiple producer, consumer, and processing containers.
# Defaults: 5 producers, 1 consumer, 2 processors.
# Requires Docker and env vars for Kafka (and Firestore creds for consumer/processing).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load local overrides if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

: "${KAFKA_BOOTSTRAP:?Set KAFKA_BOOTSTRAP for Kafka brokers}"

PRODUCER_COUNT=${PRODUCER_COUNT:-5}
CONSUMER_COUNT=${CONSUMER_COUNT:-1}
PROCESSOR_COUNT=${PROCESSOR_COUNT:-2}

PRODUCER_IMAGE=${PRODUCER_IMAGE:-dynamap-producer}
CONSUMER_IMAGE=${CONSUMER_IMAGE:-dynamap-consumer}
PROCESSING_IMAGE=${PROCESSING_IMAGE:-dynamap-processing}

echo "Building images..."
docker build -f src/datastream/producer/Dockerfile -t "$PRODUCER_IMAGE" .
docker build -f src/datastream/consumer/Dockerfile -t "$CONSUMER_IMAGE" .
docker build -f src/datastream/processing/Dockerfile -t "$PROCESSING_IMAGE" .

run_producers() {
  echo "Starting $PRODUCER_COUNT producer(s)..."
  for i in $(seq 1 "$PRODUCER_COUNT"); do
    docker run -d --rm \
      --name "producer-$i" \
      -e KAFKA_BOOTSTRAP \
      -e KAFKA_SECURITY_PROTOCOL \
      -e KAFKA_SASL_MECHANISM \
      -e KAFKA_SASL_USERNAME \
      -e KAFKA_SASL_PASSWORD \
      -e STORE_ID="store_$i" \
      "$PRODUCER_IMAGE"
  done
}

run_consumers() {
  echo "Starting $CONSUMER_COUNT consumer(s)..."
  for i in $(seq 1 "$CONSUMER_COUNT"); do
    docker run -d --rm \
      --name "consumer-$i" \
      -e KAFKA_BOOTSTRAP \
      -e KAFKA_SECURITY_PROTOCOL \
      -e KAFKA_SASL_MECHANISM \
      -e KAFKA_SASL_USERNAME \
      -e KAFKA_SASL_PASSWORD \
      "$CONSUMER_IMAGE"
  done
}

run_processors() {
  echo "Starting $PROCESSOR_COUNT processor(s)..."
  for i in $(seq 1 "$PROCESSOR_COUNT"); do
    host_port=$((8080 + i - 1))
    docker run -d --rm \
      --name "processing-$i" \
      -p "${host_port}:8080" \
      -e GOOGLE_APPLICATION_CREDENTIALS \
      "$PROCESSING_IMAGE"
  done
}

run_producers
run_consumers
run_processors

echo "Done. Running containers:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
