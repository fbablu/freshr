import json
from pathlib import Path


def test_processed_schema_requires_measurement_id():
    schema = json.loads(
        Path("src/datastream/schemas/sensor-processed-event.json").read_text()
    )
    assert "measurement_id" in schema["required"]
