import json
import os
import random
import socket
from pathlib import Path
from typing import List

from confluent_kafka import Consumer
from google.cloud import firestore

PROCESSED_TOPIC = os.getenv("PROCESSED_TOPIC", "price-events-processed")
PROCESSOR_ID = os.getenv("PROCESSOR_ID") or socket.gethostname()


def load_tracked_products(path: Path) -> List[str]:
    with path.open() as f:
        products = json.load(f)
    return [p for p in products if isinstance(p, str)]


def pick_anomaly_label() -> str:
    return random.choice(["positive", "negative", "none"])


def compute_total(products: List[str], event: dict) -> float:
    """Compute total for tracked products from Firestore snapshot."""
    store_id = event.get("store_id")
    if not store_id:
        return 0.0

    prices_ref = db.collection("prices").where("store_id", "==", store_id).stream()
    total = 0.0
    for doc in prices_ref:
        data = doc.to_dict()
        if data.get("product_id") in products:
            total += float(data.get("price", 0.0))
    return round(total, 2)


def annotate_doc(doc_id: str, anomaly: str, tracked_total: float):
    db.collection("prices").document(doc_id).set(
        {
            "anomaly": anomaly,
            "tracked_total": tracked_total,
            "processed_by": PROCESSOR_ID,
        },
        merge=True,
    )


config_path = Path(__file__).parent / "tracked_products.json"
tracked_products = load_tracked_products(config_path)

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

while True:
    msg = consumer.poll(1.0)
    if not msg or msg.error():
        continue

    event = json.loads(msg.value())
    doc_id = event.get("doc_id")
    if not doc_id:
        continue

    anomaly = pick_anomaly_label()
    tracked_total = compute_total(tracked_products, event)
    annotate_doc(doc_id, anomaly, tracked_total)
    print("Annotated doc", doc_id, "with", anomaly, tracked_total, "by", PROCESSOR_ID)
