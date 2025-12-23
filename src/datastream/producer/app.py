import os, json, time, random
from datetime import datetime
from confluent_kafka import Producer

conf = {
    "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
    "security.protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
}

producer = Producer(conf)

def generate_event():
    return {
        "store_id": "store_1",
        "product_id": random.choice(["eggs", "milk", "bread"]),
        "price": round(random.uniform(2, 6), 2),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

while True:
    event = generate_event()
    producer.produce("price-events", json.dumps(event))
    producer.flush()
    print("Produced:", event)
    time.sleep(2)