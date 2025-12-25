import json
import os
import random
import socket
import threading
from datetime import datetime, timezone
from pathlib import Path

from confluent_kafka import Consumer
from flask import Flask
from google.cloud import firestore
from jsonschema import ValidationError, validate

PROCESSED_TOPIC = os.getenv("PROCESSED_TOPIC", "sensor-events-processed")
PROCESSOR_ID = os.getenv("PROCESSOR_ID") or socket.gethostname()
DEVICE_COLLECTION = os.getenv("DEVICE_COLLECTION", "device_measurements")
ANOMALIES_COLLECTION = os.getenv("ANOMALIES_COLLECTION", "anomalies")


def load_schema(file_name: str):
    candidates = [
        Path(__file__).with_name(file_name),
        Path(__file__).parent / "schemas" / file_name,
        Path(__file__).parent.parent / "schemas" / file_name,
    ]
    for path in candidates:
        if path.exists():
            with path.open() as f:
                return json.load(f)
    raise FileNotFoundError(f"Schema {file_name} not found")


PROCESSED_SCHEMA = load_schema("sensor-processed-event.json")
ANOMALY_SCHEMA = load_schema("sensor-anomaly.json")

# Only physical sensors get anomaly flags; others default to "none".
ANOMALY_SENSOR_TYPES = {
    "cold_storage_temperature",
    "ambient_kitchen_temperature",
    "humidity",
    "time_out_of_range_duration",
}


def pick_anomaly_label(sensor_type: str) -> str:
    if sensor_type not in ANOMALY_SENSOR_TYPES:
        return "none"
    return random.choice(["positive", "negative", "none"])


def persist_anomaly(payload: dict):
    try:
        validate(instance=payload, schema=ANOMALY_SCHEMA)
    except ValidationError as exc:
        print("Invalid anomaly payload, skipping:", exc)
        return
    db.collection(ANOMALIES_COLLECTION).add(payload)


consumer = Consumer(
    {
        "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
        "group.id": "processor",
        "auto.offset.reset": "earliest",
        "security.protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
        "sasl.mechanism": os.getenv("KAFKA_SASL_MECHANISM"),
        "sasl.username": os.getenv("KAFKA_SASL_USERNAME"),
        "sasl.password": os.getenv("KAFKA_SASL_PASSWORD"),
    }
)
consumer.subscribe([PROCESSED_TOPIC])

db = firestore.Client()


def main():
    while True:
        msg = consumer.poll(1.0)
        if not msg or msg.error():
            continue

        event = json.loads(msg.value())
        try:
            validate(instance=event, schema=PROCESSED_SCHEMA)
        except ValidationError as exc:
            print("Invalid processed event, skipping:", exc)
            continue

        measurement_id = event.get("measurement_id")
        sensor_type = event.get("sensor_type")
        if not measurement_id or not sensor_type:
            continue

        anomaly = pick_anomaly_label(sensor_type)
        timestamp = event.get("timestamp") or datetime.now(timezone.utc).isoformat()

        db.collection(DEVICE_COLLECTION).document(measurement_id).set(
            {"anomaly": anomaly, "processed_by": PROCESSOR_ID}, merge=True
        )

        anomaly_payload = {
            "measurement_id": measurement_id,
            "sensor_type": sensor_type,
            "anomaly": anomaly,
            "processed_by": PROCESSOR_ID,
            "timestamp": timestamp,
        }
        persist_anomaly(anomaly_payload)

        print(
            "Processed measurement",
            measurement_id,
            "sensor_type",
            sensor_type,
            "anomaly",
            anomaly,
            "by",
            PROCESSOR_ID,
        )


if __name__ == "__main__":
    t = threading.Thread(target=main, daemon=True)
    t.start()

    app = Flask(__name__)

    @app.route("/healthz", methods=["GET"])
    def health():
        return "ok"

    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
