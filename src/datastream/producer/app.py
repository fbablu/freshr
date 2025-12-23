import os
import json
import time
import random
from datetime import datetime
from confluent_kafka import Producer

conf = {
    "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
    "security.protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
}

STORE_ID = os.getenv("STORE_ID") or os.getenv("HOSTNAME", "store_1")

producer = Producer(conf)

BASE_PRICES = {
    "eggs": 2.00,
    "milk": 3.50,
    "bread": 2.75,
}


def generate_price(product: str) -> float:
    noise = random.gauss(0, 0.2)
    price = BASE_PRICES[product] + noise
    return round(max(price, 0.10), 2)


def generate_event():
    product = random.choice(list(BASE_PRICES))
    return {
        "store_id": STORE_ID,
        "product_id": product,
        "price": generate_price(product),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


while True:
    event = generate_event()
    producer.produce("price-events", json.dumps(event))
    producer.flush()
    print("Produced:", event)
    time.sleep(1)
