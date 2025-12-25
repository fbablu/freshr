import os
import json
import time
import random
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Dict, List

from flask import Flask
from confluent_kafka import Producer
from jsonschema import ValidationError, validate

conf = {
    "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
    "security.protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
    "sasl.mechanism": os.getenv("KAFKA_SASL_MECHANISM"),
    "sasl.username": os.getenv("KAFKA_SASL_USERNAME"),
    "sasl.password": os.getenv("KAFKA_SASL_PASSWORD"),
}

producer = Producer(conf)


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


class Sensor:
    def __init__(
        self,
        sensor_type: str,
        topic: str,
        sensor_ids: List[str],
        measurement_type: str,
        value_fn: Callable[[], object],
        frequency_hz: float,
    ):
        self.sensor_type = sensor_type
        self.topic = topic
        self.sensor_ids = sensor_ids
        self.measurement_type = measurement_type
        self.value_fn = value_fn
        self.frequency_hz = frequency_hz

    def generate_event(self) -> Dict:
        return {
            "sensor_id": random.choice(self.sensor_ids),
            "sensor_type": self.sensor_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "frequency_hz": self.frequency_hz,
            "measurement_value": self.value_fn(),
            "measurement_type": self.measurement_type,
        }


def num_in_range(low: float, high: float) -> Callable[[], float]:
    return lambda: round(random.uniform(low, high), 2)


def int_range(low: int, high: int) -> Callable[[], int]:
    return lambda: random.randint(low, high)


sensors = [
    Sensor(
        sensor_type="cold_storage_temperature",
        topic="sensor-physical-cold-storage-temperature",
        sensor_ids=["cs-1", "cs-2", "cs-3"],
        measurement_type="celsius",
        value_fn=num_in_range(-5, 5),
        frequency_hz=0.5,
    ),
    Sensor(
        sensor_type="ambient_kitchen_temperature",
        topic="sensor-physical-ambient-kitchen-temperature",
        sensor_ids=["ak-1", "ak-2"],
        measurement_type="celsius",
        value_fn=num_in_range(18, 30),
        frequency_hz=0.2,
    ),
    Sensor(
        sensor_type="humidity",
        topic="sensor-physical-humidity",
        sensor_ids=["hum-1", "hum-2"],
        measurement_type="percent",
        value_fn=num_in_range(30, 80),
        frequency_hz=0.2,
    ),
    Sensor(
        sensor_type="time_out_of_range_duration",
        topic="sensor-physical-time-out-of-range-duration",
        sensor_ids=["tor-1"],
        measurement_type="seconds",
        value_fn=num_in_range(0, 300),
        frequency_hz=0.1,
    ),
    Sensor(
        sensor_type="handwash_station_usage",
        topic="sensor-operational-handwash-station-usage",
        sensor_ids=["hw-1", "hw-2"],
        measurement_type="count",
        value_fn=int_range(0, 20),
        frequency_hz=0.05,
    ),
    Sensor(
        sensor_type="delivery_arrival",
        topic="sensor-operational-delivery-arrival",
        sensor_ids=["del-1", "del-2"],
        measurement_type="timestamp",
        value_fn=lambda: datetime.now(timezone.utc).isoformat(),
        frequency_hz=0.02,
    ),
    Sensor(
        sensor_type="shift_change",
        topic="sensor-operational-shift-change",
        sensor_ids=["shift-1"],
        measurement_type="event",
        value_fn=lambda: random.choice(["start", "end"]),
        frequency_hz=0.02,
    ),
]

SCHEMA_MAP = {sensor.topic: load_schema(f"{sensor.topic}.json") for sensor in sensors}


def pick_sensor() -> Sensor:
    return random.choice(sensors)


def main():
    while True:
        sensor = pick_sensor()
        event = sensor.generate_event()
        schema = SCHEMA_MAP[sensor.topic]
        try:
            validate(instance=event, schema=schema)
        except ValidationError as exc:
            print(f"Invalid event for {sensor.topic}, skipping:", exc)
            time.sleep(1)
            continue

        producer.produce(sensor.topic, json.dumps(event))
        producer.flush()
        print(f"Produced to {sensor.topic}:", event)
        time.sleep(1)


if __name__ == "__main__":
    # Start producer loop in background thread; expose health endpoint for Cloud Run
    t = threading.Thread(target=main, daemon=True)
    t.start()

    app = Flask(__name__)

    @app.route("/healthz", methods=["GET"])
    def health():
        return "ok"

    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
