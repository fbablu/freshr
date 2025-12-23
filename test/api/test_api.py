import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

pytest.importorskip("google.cloud.firestore")

from src.api.app import select_latest_scores


def test_select_latest_scores_picks_latest_per_store():
    entries = [
        {"store_id": "s1", "score": 2, "timestamp": "2024-01-02T00:00:00Z"},
        {"store_id": "s1", "score": 1, "timestamp": "2024-01-01T00:00:00Z"},
        {"store_id": "s2", "score": 3, "timestamp": "2024-01-03T00:00:00Z"},
    ]
    latest = select_latest_scores(entries)
    by_store = {e["store_id"]: e["score"] for e in latest}

    assert by_store["s1"] == 2  # assumes entries are pre-sorted newest-first
    assert by_store["s2"] == 3
