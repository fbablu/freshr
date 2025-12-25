import os
import json
import threading
from pathlib import Path

from confluent_kafka import Consumer, Producer
from flask import Flask
from google.cloud import firestore
from jsonschema import ValidationError, validate

SENSOR_TOPICS = [
    "sensor-physical-cold-storage-temperature",
    "sensor-physical-ambient-kitchen-temperature",
    "sensor-physical-humidity",
    "sensor-physical-time-out-of-range-duration",
    "sensor-operational-handwash-station-usage",
    "sensor-operational-delivery-arrival",
    "sensor-operational-shift-change",
]
PROCESSED_TOPIC = os.getenv("PROCESSED_TOPIC", "sensor-events-processed")
DEVICE_COLLECTION = os.getenv("DEVICE_COLLECTION", "device_measurements")


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


SCHEMA_MAP = {topic: load_schema(f"{topic}.json") for topic in SENSOR_TOPICS}
PROCESSED_SCHEMA = load_schema("sensor-processed-event.json")

consumer = Consumer(
    {
        "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
        "group.id": "sensor-consumer",
        "auto.offset.reset": "earliest",
        "security.protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
        "sasl.mechanism": os.getenv("KAFKA_SASL_MECHANISM"),
        "sasl.username": os.getenv("KAFKA_SASL_USERNAME"),
        "sasl.password": os.getenv("KAFKA_SASL_PASSWORD"),
    }
)
producer = Producer(
    {
        "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
        "security.protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
        "sasl.mechanism": os.getenv("KAFKA_SASL_MECHANISM"),
        "sasl.username": os.getenv("KAFKA_SASL_USERNAME"),
        "sasl.password": os.getenv("KAFKA_SASL_PASSWORD"),
    }
)

consumer.subscribe(SENSOR_TOPICS)
db = firestore.Client()


def forward_to_processed(event, doc_id):
    payload = dict(event)
    payload["measurement_id"] = doc_id
    payload["source_topic"] = event.get("source_topic") or ""
    try:
        validate(instance=payload, schema=PROCESSED_SCHEMA)
    except ValidationError as exc:
        print("Invalid processed payload, skipping:", exc)
        return
    producer.produce(PROCESSED_TOPIC, json.dumps(payload))


def main():
    while True:
        msg = consumer.poll(1.0)
        if not msg or msg.error():
            continue
        topic = msg.topic()
        if topic not in SCHEMA_MAP:
            print("Received message for unknown topic", topic)
            continue

        event = json.loads(msg.value())
        try:
            validate(instance=event, schema=SCHEMA_MAP[topic])
        except ValidationError as exc:
            print("Invalid event, skipping:", exc)
            continue

        event["source_topic"] = topic
        doc_ref = db.collection(DEVICE_COLLECTION).add(event)[1]
        forward_to_processed(event, doc_ref.id)
        producer.flush()
        print(f"Stored and forwarded from {topic}:", event)


if __name__ == "__main__":
    t = threading.Thread(target=main, daemon=True)
    t.start()

    app = Flask(__name__)

    @app.route("/healthz", methods=["GET"])
    def health():
        return "ok"

    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
