import os
from typing import Dict, List

from flask import Flask, jsonify
from google.cloud import firestore

DEVICE_COLLECTION = os.getenv("DEVICE_COLLECTION", "device_measurements")
ANOMALIES_COLLECTION = os.getenv("ANOMALIES_COLLECTION", "anomalies")

app = Flask(__name__)
db = firestore.Client()


def select_latest_by(entries: List[Dict], key: str) -> List[Dict]:
    """Return the most recent entry per key, assuming entries are pre-sorted newest-first."""
    latest = {}
    for entry in entries:
        entry_key = entry.get(key)
        if not entry_key or entry_key in latest:
            continue
        latest[entry_key] = entry
    return list(latest.values())


@app.route("/measurements/recent", methods=["GET"])
def recent_measurements():
    ref = (
        db.collection(DEVICE_COLLECTION)
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(50)
        .stream()
    )
    entries = []
    for doc in ref:
        data = doc.to_dict()
        if not data:
            continue
        data["id"] = doc.id
        entries.append(data)
    latest = select_latest_by(entries, key="sensor_id")
    return jsonify({"measurements": latest})


@app.route("/anomalies/recent", methods=["GET"])
def recent_anomalies():
    ref = (
        db.collection(ANOMALIES_COLLECTION)
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(50)
        .stream()
    )
    entries = []
    for doc in ref:
        data = doc.to_dict()
        if not data:
            continue
        data["id"] = doc.id
        entries.append(data)
    latest = select_latest_by(entries, key="measurement_id")
    return jsonify({"anomalies": latest})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
