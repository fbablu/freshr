import importlib
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# mock google.cloud.firestore
fake_firestore = types.SimpleNamespace(Query=types.SimpleNamespace(DESCENDING="DESC"))
fake_firestore.Client = lambda *args, **kwargs: object()
fake_cloud = types.SimpleNamespace(firestore=fake_firestore)
sys.modules["google"] = types.SimpleNamespace(cloud=fake_cloud)
sys.modules["google.cloud"] = fake_cloud
sys.modules["google.cloud.firestore"] = fake_firestore

app = importlib.import_module("src.api.app")
select_latest_by = app.select_latest_by


def test_select_latest_by_picks_latest_per_sensor():
    entries = [
        {
            "sensor_id": "s1",
            "measurement_value": 2,
            "timestamp": "2024-01-02T00:00:00Z",
        },
        {
            "sensor_id": "s1",
            "measurement_value": 1,
            "timestamp": "2024-01-01T00:00:00Z",
        },
        {
            "sensor_id": "s2",
            "measurement_value": 3,
            "timestamp": "2024-01-03T00:00:00Z",
        },
    ]
    latest = select_latest_by(entries, key="sensor_id")
    by_sensor = {e["sensor_id"]: e["measurement_value"] for e in latest}

    assert by_sensor["s1"] == 2
    assert by_sensor["s2"] == 3
