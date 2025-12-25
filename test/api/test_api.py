import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class FakeDoc:
    def __init__(self, id, data):
        self.id = id
        self._data = data

    def to_dict(self):
        return dict(self._data)

    @property
    def exists(self):
        return True


class FakeDocRef:
    def __init__(self, doc):
        self._doc = doc

    def get(self):
        return self._doc


class FakeCollection:
    def __init__(self, docs):
        self._docs = docs
        self._filters = []
        self._order = None
        self._limit = None

    def where(self, field, op, value):
        def f(doc):
            v = doc._data.get(field)
            if op == "==":
                return v == value
            elif op == ">=":
                return v >= value
            elif op == "<=":
                return v <= value
            return True

        clone = FakeCollection(list(self._docs))
        clone._filters = self._filters + [f]
        clone._order = self._order
        clone._limit = self._limit
        return clone

    def order_by(self, field, direction=None):
        clone = FakeCollection(list(self._docs))
        clone._filters = self._filters
        clone._order = (field, direction)
        clone._limit = self._limit
        return clone

    def limit(self, n):
        clone = FakeCollection(list(self._docs))
        clone._filters = self._filters
        clone._order = self._order
        clone._limit = n
        return clone

    def stream(self):
        docs = self._docs
        for f in self._filters:
            docs = [d for d in docs if f(d)]
        if self._order:
            field, direction = self._order
            reverse = False
            if direction in ("DESC", "DESCENDING", -1):
                reverse = True
            docs = sorted(docs, key=lambda d: d._data.get(field), reverse=reverse)
        if self._limit:
            docs = docs[: self._limit]
        return docs

    def document(self, doc_id):
        for d in self._docs:
            if d.id == doc_id:
                return FakeDocRef(d)
        return FakeDocRef(FakeDoc(doc_id, {}))


class FakeClient:
    def __init__(self, datasets):
        self.datasets = datasets

    def collection(self, name):
        docs = [
            FakeDoc(d["id"], {k: v for k, v in d.items() if k != "id"})
            for d in self.datasets.get(name, [])
        ]
        return FakeCollection(docs)


def make_fake_firestore(datasets):
    fake_module = types.SimpleNamespace()
    fake_module.Query = types.SimpleNamespace(DESCENDING="DESC")
    fake_module.Client = lambda *args, **kwargs: FakeClient(datasets)
    return fake_module


def test_api_endpoints(monkeypatch):
    datasets = {
        "device_measurements": [
            {
                "id": "m1",
                "sensor_id": "s1",
                "sensor_type": "t1",
                "timestamp": "2025-01-02T00:00:00Z",
                "measurement_type": "celsius",
                "measurement_value": 1,
            },
            {
                "id": "m2",
                "sensor_id": "s1",
                "sensor_type": "t1",
                "timestamp": "2025-01-01T00:00:00Z",
                "measurement_type": "celsius",
                "measurement_value": 2,
            },
            {
                "id": "m3",
                "sensor_id": "s2",
                "sensor_type": "t2",
                "timestamp": "2025-01-03T00:00:00Z",
                "measurement_type": "percent",
                "measurement_value": 3,
            },
        ],
        "anomalies": [
            {
                "id": "a1",
                "measurement_id": "m1",
                "sensor_id": "s1",
                "sensor_type": "t1",
                "timestamp": "2025-01-04T00:00:00Z",
                "anomaly": "pos",
            },
            {
                "id": "a2",
                "measurement_id": "m3",
                "sensor_id": "s2",
                "sensor_type": "t2",
                "timestamp": "2025-01-05T00:00:00Z",
                "anomaly": "none",
            },
        ],
    }
    fake_fs = make_fake_firestore(datasets)
    sys.modules["google"] = types.SimpleNamespace(
        cloud=types.SimpleNamespace(firestore=fake_fs)
    )
    sys.modules["google.cloud"] = types.SimpleNamespace(firestore=fake_fs)
    sys.modules["google.cloud.firestore"] = fake_fs

    from src.api.app import create_app

    app = create_app()
    client = app.test_client()

    # measurements/recent
    resp = client.get("/measurements/recent")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["measurements"]) == 2

    # measurements/count
    resp = client.get("/measurements/count?sensor_id=s1")
    assert resp.get_json()["count"] == 2

    # measurement-type
    resp = client.get("/measurements/measurement-type?sensor_id=s1")
    assert resp.status_code == 200
    assert resp.get_json()["measurement_type"] == "celsius"

    # measurements/time-series
    resp = client.get("/measurements/time-series?granularity=day")
    assert resp.status_code == 200
    series = resp.get_json()["series"]
    assert series
    assert "values" in series[0]

    # measurements/values
    resp = client.get("/measurements/values?limit=2")
    vals = resp.get_json()["measurements"]
    assert len(vals) <= 2
    assert any(v["sensor_id"] == "s1" for v in vals)

    # anomalies/aggregate
    resp = client.get("/anomalies/aggregate?sensor_type=t1")
    assert resp.get_json()["count"] == 1
    resp = client.get("/anomalies/aggregate?anomaly=pos")
    assert resp.get_json()["count"] == 1

    # anomalies/by-sensor
    resp = client.get("/anomalies/by-sensor?sensor_id=s1")
    payload = resp.get_json()
    assert len(payload["results"]) == 1
    assert payload["results"][0]["measurement"]["measurement_type"] == "celsius"

    # anomalies/time-series
    resp = client.get("/anomalies/time-series?anomaly=pos")
    series = resp.get_json()["series"]
    assert series

    # devices
    resp = client.get("/devices")
    devices = resp.get_json()["devices"]
    assert any(d["sensor_id"] == "s1" for d in devices)
