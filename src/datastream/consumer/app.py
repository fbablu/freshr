import os
import json
from confluent_kafka import Consumer, Producer
from google.cloud import firestore

INPUT_TOPIC = os.getenv("INPUT_TOPIC", "price-events")
PROCESSED_TOPIC = os.getenv("PROCESSED_TOPIC", "price-events-processed")

consumer = Consumer(
    {
        "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
        "group.id": "price-consumer",
        "auto.offset.reset": "earliest",
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
    doc_ref = db.collection("prices").add(event)[1]
    forward_to_processed(event, doc_ref.id)
    producer.flush()
    print("Stored and forwarded:", event)
