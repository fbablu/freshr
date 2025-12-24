import os
import json
from pathlib import Path

from confluent_kafka import Consumer, Producer
from google.cloud import firestore
from jsonschema import ValidationError, validate

INPUT_TOPIC = os.getenv("INPUT_TOPIC", "price-events")
PROCESSED_TOPIC = os.getenv("PROCESSED_TOPIC", "price-events-processed")


def load_schema(file_name: str):
    local_path = Path(__file__).with_name(file_name)
    repo_path = Path(__file__).parent.parent / "schemas" / file_name
    for path in (local_path, repo_path):
        if path.exists():
            with path.open() as f:
                return json.load(f)
    raise FileNotFoundError(f"Schema {file_name} not found")


PRICE_SCHEMA = load_schema("price_events.json")

consumer = Consumer(
    {
        "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
        "group.id": "price-consumer",
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

consumer.subscribe([INPUT_TOPIC])
db = firestore.Client()


def forward_to_processed(event, doc_id):
    payload = dict(event)
    payload["doc_id"] = doc_id
    producer.produce(PROCESSED_TOPIC, json.dumps(payload))


while True:
    msg = consumer.poll(1.0)
    if not msg or msg.error():
        continue

    event = json.loads(msg.value())
    try:
        validate(instance=event, schema=PRICE_SCHEMA)
    except ValidationError as exc:
        print("Invalid event, skipping:", exc)
        continue

    doc_ref = db.collection("prices").add(event)[1]
    forward_to_processed(event, doc_ref.id)
    producer.flush()
    print("Stored and forwarded:", event)
