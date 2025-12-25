from typing import Dict, List, Optional

from flask import request


def select_latest_by(entries: List[Dict], key: str) -> List[Dict]:
    """Return the most recent entry per key, assuming entries are pre-sorted newest-first."""
    latest = {}
    for entry in entries:
        entry_key = entry.get(key)
        if not entry_key or entry_key in latest:
            continue
        latest[entry_key] = entry
    return list(latest.values())


def parse_time_param(name: str) -> Optional[str]:
    val = request.args.get(name)
    return val if val else None
