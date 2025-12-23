import os
from typing import Dict, List

from flask import Flask, jsonify
from google.cloud import firestore

SCORES_COLLECTION = os.getenv("SCORES_COLLECTION", "scores")

app = Flask(__name__)
db = firestore.Client()


def select_latest_scores(entries: List[Dict]) -> List[Dict]:
    """Return the most recent score per store, assuming entries are pre-sorted newest-first."""
    latest = {}
    for entry in entries:
        store_id = entry.get("store_id")
        if not store_id or store_id in latest:
            continue
        latest[store_id] = {
            "store_id": store_id,
            "score": entry.get("score"),
            "timestamp": entry.get("timestamp"),
        }
    return list(latest.values())


@app.route("/scores/recent", methods=["GET"])
def recent_scores():
    scores_ref = (
        db.collection(SCORES_COLLECTION)
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .stream()
    )

    entries = []
    for doc in scores_ref:
        data = doc.to_dict()
        if not data:
            continue
        # Ensure store_id travels along
        data["store_id"] = data.get("store_id")
        entries.append(data)

    latest = select_latest_scores(entries)
    return jsonify({"scores": latest})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
