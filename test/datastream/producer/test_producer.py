import json
from pathlib import Path


def test_sensor_schema_has_fields():
    schema_path = Path("src/datastream/schemas/sensor-physical-humidity.json")
    schema = json.loads(schema_path.read_text())
    for field in ["sensor_id", "sensor_type", "timestamp", "measurement_value"]:
        assert field in schema["required"]
