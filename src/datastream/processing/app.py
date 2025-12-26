import json
import os
import socket
import threading
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev

from confluent_kafka import Consumer
from flask import Flask
from google.cloud import firestore
from jsonschema import ValidationError, validate

from src.datastream.processing.ai_client import predict_anomaly

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


def detect_anomaly_from_history(values, current, z_threshold=2.5, min_history=5):
    """Return 'positive' if too high, 'negative' if too low, else 'none'."""
    numeric_history = [v for v in values if isinstance(v, (int, float))]
    if not isinstance(current, (int, float)):
        return "none"
    if len(numeric_history) < min_history:
        return "none"
    mu = mean(numeric_history)
    sigma = pstdev(numeric_history) if len(numeric_history) > 1 else 0.0
    if sigma == 0:
        return "none"
    z = (current - mu) / sigma
    if z > z_threshold:
        return "positive"
    if z < -z_threshold:
        return "negative"
    return "none"


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

        sensor_id = event.get("sensor_id")
        current_value = event.get("measurement_value")
        history_values = []
        vertex_anomaly = None
        if sensor_id and sensor_type in ANOMALY_SENSOR_TYPES:
            history_ref = (
                db.collection(DEVICE_COLLECTION)
                .where("sensor_id", "==", sensor_id)
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(50)
            )
            try:
                for doc in history_ref.stream():
                    data = doc.to_dict() or {}
                    val = data.get("measurement_value")
                    if isinstance(val, (int, float)):
                        history_values.append(val)
                if history_values:
                    mu = mean(history_values)
                    sigma = pstdev(history_values) if len(history_values) > 1 else 0.0
                    vertex_anomaly = predict_anomaly(
                        current_value, sensor_id, sensor_type, mu, sigma
                    )
            except Exception as exc:
                print("Failed to load history for anomaly detection:", exc)

        if vertex_anomaly:
            anomaly = vertex_anomaly
        else:
            anomaly = (
                detect_anomaly_from_history(history_values, current_value)
                if sensor_type in ANOMALY_SENSOR_TYPES
                else "none"
            )
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
