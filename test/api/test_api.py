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
select_latest_scores = app.select_latest_scores


def test_select_latest_scores_picks_latest_per_store():
    entries = [
        {"store_id": "s1", "score": 2, "timestamp": "2024-01-02T00:00:00Z"},
        {"store_id": "s1", "score": 1, "timestamp": "2024-01-01T00:00:00Z"},
        {"store_id": "s2", "score": 3, "timestamp": "2024-01-03T00:00:00Z"},
    ]
    latest = select_latest_scores(entries)
    by_store = {e["store_id"]: e["score"] for e in latest}

    assert by_store["s1"] == 2
    assert by_store["s2"] == 3
