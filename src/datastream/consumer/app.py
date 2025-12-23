import os
import json
from confluent_kafka import Consumer
from google.cloud import firestore

consumer = Consumer(
    {
        "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
        "group.id": "price-consumer",
        "auto.offset.reset": "earliest",
    }
)

consumer.subscribe(["price-events"])
db = firestore.Client()

while True:
    msg = consumer.poll(1.0)
    if not msg or msg.error():
        continue

    event = json.loads(msg.value())
    db.collection("prices").add(event)
    print("Stored:", event)
