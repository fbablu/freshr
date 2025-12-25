import json
from pathlib import Path


def test_anomaly_schema_has_fields():
    schema = json.loads(Path("src/datastream/schemas/sensor-anomaly.json").read_text())
    for field in ["measurement_id", "sensor_type", "anomaly", "timestamp"]:
        assert field in schema["required"]
