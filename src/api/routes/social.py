"""Simulating Twitter/Yelp feeds."""

from flask import jsonify, request
from datetime import datetime, timedelta


# Pre-curated social signals that correlate with outbreak scenarios
ECOLI_SOCIAL_SIGNALS = [
    {
        "id": "tw-1",
        "platform": "twitter",
        "author": "@frustrated_customer",
        "content": "Just got the worst stomach cramps after eating at McDonald's on Main St. Anyone else feeling sick? 🤢",
        "timestamp_offset_minutes": -180,  # 3 hours after incident
        "sentiment": "negative",
        "keywords": ["stomach", "sick", "McDonald's"],
        "severity": "early_signal",
    },
    {
        "id": "tw-2",
        "platform": "twitter",
        "author": "@healthwatch_local",
        "content": "Hearing reports of food poisoning from multiple fast food locations in the area. Stay vigilant! #foodsafety",
        "timestamp_offset_minutes": -120,
        "sentiment": "warning",
        "keywords": ["food poisoning", "reports"],
        "severity": "escalating",
    },
    {
        "id": "yelp-1",
        "platform": "yelp",
        "author": "Sarah M.",
        "rating": 1,
        "content": "AVOID! My whole family got sick after eating here yesterday. Severe nausea and vomiting. Something is seriously wrong with their food handling.",
        "timestamp_offset_minutes": -90,
        "sentiment": "negative",
        "keywords": ["sick", "nausea", "vomiting", "food handling"],
        "severity": "confirmed",
    },
    {
        "id": "tw-3",
        "platform": "twitter",
        "author": "@local_news_alert",
        "content": "BREAKING: Health department investigating reports of illness linked to local McDonald's. Onions suspected. More at 11.",
        "timestamp_offset_minutes": -60,
        "sentiment": "news",
        "keywords": ["health department", "illness", "onions"],
        "severity": "outbreak",
    },
    {
        "id": "yelp-2",
        "platform": "yelp",
        "author": "Mike R.",
        "rating": 1,
        "content": "E. coli symptoms after eating Quarter Pounder. Been to ER twice. This is a serious public health issue.",
        "timestamp_offset_minutes": -30,
        "sentiment": "negative",
        "keywords": ["E. coli", "ER", "Quarter Pounder"],
        "severity": "outbreak",
    },
]

DRIFT_SOCIAL_SIGNALS = [
    {
        "id": "yelp-d1",
        "platform": "yelp",
        "author": "Jennifer K.",
        "rating": 2,
        "content": "Salad seemed a bit warm, lettuce was wilted. Not up to usual standards.",
        "timestamp_offset_minutes": -60,
        "sentiment": "negative",
        "keywords": ["warm", "wilted", "standards"],
        "severity": "early_signal",
    },
    {
        "id": "tw-d1",
        "platform": "twitter",
        "author": "@foodie_reviewer",
        "content": "Pro tip: if your restaurant's cold items aren't cold, that's a red flag 🚩 Just had lukewarm coleslaw",
        "timestamp_offset_minutes": -45,
        "sentiment": "warning",
        "keywords": ["cold", "lukewarm"],
        "severity": "early_signal",
    },
]

HYGIENE_SOCIAL_SIGNALS = [
    {
        "id": "yelp-h1",
        "platform": "yelp",
        "author": "David L.",
        "rating": 2,
        "content": "Watched the cook handle raw meat then touch my burger bun without washing hands. Gross.",
        "timestamp_offset_minutes": -30,
        "sentiment": "negative",
        "keywords": ["raw meat", "hands", "washing"],
        "severity": "observed",
    },
    {
        "id": "tw-h1",
        "platform": "twitter",
        "author": "@cleankitchen_advocate",
        "content": "Why is hand hygiene so hard for some restaurants? Just witnessed zero handwashing between tasks 😤",
        "timestamp_offset_minutes": -20,
        "sentiment": "negative",
        "keywords": ["hand hygiene", "handwashing"],
        "severity": "observed",
    },
]

SCENARIO_SIGNALS = {
    "ecoli": ECOLI_SOCIAL_SIGNALS,
    "drift": DRIFT_SOCIAL_SIGNALS,
    "hygiene": HYGIENE_SOCIAL_SIGNALS,
    "normal": [],
    "recovery": [],
}


def register(app):
    """Register social signal routes."""

    @app.route("/social/signals", methods=["GET"])
    def get_social_signals():
        """Get social signals for current scenario."""
        scenario = request.args.get("scenario", "ecoli")
        limit = int(request.args.get("limit", 10))

        signals = SCENARIO_SIGNALS.get(scenario, [])
        now = datetime.utcnow()

        # Add computed timestamps
        result = []
        for sig in signals[:limit]:
            signal_copy = sig.copy()
            offset = sig.get("timestamp_offset_minutes", 0)
            signal_copy["timestamp"] = (
                now + timedelta(minutes=offset)
            ).isoformat() + "Z"
            signal_copy["relative_time"] = format_relative_time(offset)
            result.append(signal_copy)

        return jsonify({"signals": result, "scenario": scenario, "count": len(result)})

    @app.route("/social/timeline", methods=["GET"])
    def get_social_timeline():
        """Get combined timeline of anomalies + social signals."""
        scenario = request.args.get("scenario", "ecoli")

        signals = SCENARIO_SIGNALS.get(scenario, [])
        now = datetime.utcnow()

        timeline = []

        # Add social signals
        for sig in signals:
            offset = sig.get("timestamp_offset_minutes", 0)
            timeline.append(
                {
                    "type": "social",
                    "source": sig["platform"],
                    "content": (
                        sig["content"][:100] + "..."
                        if len(sig["content"]) > 100
                        else sig["content"]
                    ),
                    "severity": sig["severity"],
                    "timestamp": (now + timedelta(minutes=offset)).isoformat() + "Z",
                    "sort_key": offset,
                }
            )

        # Add synthetic anomaly markers
        if scenario == "ecoli":
            anomaly_events = [
                {
                    "offset": -120,
                    "type": "anomaly",
                    "content": "Temperature drift detected in Cold Storage",
                    "severity": "medium",
                },
                {
                    "offset": -90,
                    "type": "anomaly",
                    "content": "Temperature exceeds 7°C - HIGH alert",
                    "severity": "high",
                },
                {
                    "offset": -60,
                    "type": "anomaly",
                    "content": "Handwash compliance failure in Prep Station",
                    "severity": "high",
                },
                {
                    "offset": -30,
                    "type": "anomaly",
                    "content": "CRITICAL: Multiple zones affected",
                    "severity": "critical",
                },
            ]
            for evt in anomaly_events:
                timeline.append(
                    {
                        "type": "anomaly",
                        "source": "freshr",
                        "content": evt["content"],
                        "severity": evt["severity"],
                        "timestamp": (
                            now + timedelta(minutes=evt["offset"])
                        ).isoformat()
                        + "Z",
                        "sort_key": evt["offset"],
                    }
                )

        # Sort by time (most recent first)
        timeline.sort(key=lambda x: x["sort_key"], reverse=True)

        # Remove sort_key from output
        for item in timeline:
            del item["sort_key"]

        return jsonify({"timeline": timeline, "scenario": scenario})

    @app.route("/social/correlation", methods=["GET"])
    def get_correlation():
        """Show correlation between sensor anomalies and social signals."""
        scenario = request.args.get("scenario", "ecoli")

        if scenario != "ecoli":
            return jsonify(
                {
                    "correlation": None,
                    "message": "Correlation analysis available for ecoli scenario",
                }
            )

        return jsonify(
            {
                "correlation": {
                    "anomaly_detection_time": "T-90 minutes",
                    "first_social_signal": "T+180 minutes (3 hours after serving)",
                    "public_health_alert": "T+24 hours",
                    "freshr_advantage": "4.5 hours earlier detection vs social monitoring alone",
                    "potential_cases_prevented": "Estimated 60-80% reduction with early intervention",
                },
                "insight": "Freshr detected temperature drift 90 minutes before contaminated food was served. Social signals appeared 3 hours AFTER consumption. Early detection could have prevented the outbreak entirely.",
            }
        )


def format_relative_time(offset_minutes):
    """Format offset as human-readable relative time."""
    if offset_minutes == 0:
        return "now"

    abs_minutes = abs(offset_minutes)

    if abs_minutes < 60:
        unit = "minute" if abs_minutes == 1 else "minutes"
        time_str = f"{abs_minutes} {unit}"
    else:
        hours = abs_minutes // 60
        unit = "hour" if hours == 1 else "hours"
        time_str = f"{hours} {unit}"

    if offset_minutes < 0:
        return f"{time_str} ago"
    else:
        return f"in {time_str}"
