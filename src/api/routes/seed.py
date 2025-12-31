from flask import jsonify, request
from datetime import datetime, timedelta
import random


# Zone configurations matching frontend
ZONES = {
    "zone-recv-1": {"name": "Receiving", "sensors": ["rc-1", "rc-2"]},
    "zone-cold-1": {"name": "Cold Storage", "sensors": ["cs-1", "cs-2", "cs-3"]},
    "zone-prep-1": {"name": "Prep Station", "sensors": ["hw-1", "hw-2", "pp-1"]},
    "zone-cook-1": {"name": "Cook Line", "sensors": ["ck-1", "ck-2"]},
    "zone-wash-1": {"name": "Washing", "sensors": ["dw-1", "hw-3"]},
}


def clear_collections(db, *collections):
    """Clear all documents from specified collections."""
    for coll in collections:
        docs = db.collection(coll).limit(500).stream()
        for doc in docs:
            doc.reference.delete()


def register(app, db, measurements_collection, anomalies_collection):

    @app.route("/seed", methods=["POST"])
    def seed_data():
        """Seed test data for demo scenarios."""
        scenario = request.args.get("scenario", "drift")
        clear_existing = request.args.get("clear", "true").lower() == "true"

        if clear_existing:
            clear_collections(db, measurements_collection, anomalies_collection)

        now = datetime.utcnow()
        created = {"measurements": 0, "anomalies": 0}

        if scenario == "ecoli":
            created = seed_ecoli_scenario(
                db, measurements_collection, anomalies_collection, now
            )
        elif scenario == "drift":
            created = seed_drift_scenario(
                db, measurements_collection, anomalies_collection, now
            )
        elif scenario == "hygiene":
            created = seed_hygiene_scenario(
                db, measurements_collection, anomalies_collection, now
            )
        elif scenario == "recovery":
            created = seed_recovery_scenario(
                db, measurements_collection, anomalies_collection, now
            )
        elif scenario == "normal":
            created = seed_normal_scenario(
                db, measurements_collection, anomalies_collection, now
            )
        else:
            return jsonify({"error": f"Unknown scenario: {scenario}"}), 400

        return jsonify(
            {
                "scenario": scenario,
                "created": created,
                "timestamp": now.isoformat() + "Z",
            }
        )

    @app.route("/seed/clear", methods=["POST"])
    def clear_data():
        """Clear all demo data."""
        clear_collections(db, measurements_collection, anomalies_collection)
        return jsonify({"cleared": True})

    @app.route("/scenarios", methods=["GET"])
    def list_scenarios():
        """List available demo scenarios."""
        return jsonify(
            {
                "scenarios": [
                    {
                        "id": "ecoli",
                        "name": "McDonald's E. coli Outbreak (Oct 2024)",
                        "description": "Simulates the onion contamination event - temperature drift + hygiene failures leading to multi-zone outbreak",
                    },
                    {
                        "id": "drift",
                        "name": "Temperature Drift",
                        "description": "Cold storage temperature gradually rising, simulating refrigeration failure",
                    },
                    {
                        "id": "hygiene",
                        "name": "Hygiene Compliance Failure",
                        "description": "Handwash station compliance drops during busy period",
                    },
                    {
                        "id": "recovery",
                        "name": "Recovery Mode",
                        "description": "System recovering from previous incident, temperatures normalizing",
                    },
                    {
                        "id": "normal",
                        "name": "Normal Operations",
                        "description": "Baseline healthy kitchen operations",
                    },
                ]
            }
        )


def seed_ecoli_scenario(db, meas_coll, anom_coll, now):
    """
    McDonald's E. coli outbreak scenario (Oct 2024).

    Timeline recreation:
    - T-120min: Onion delivery arrives at receiving
    - T-90min: Temperature drift begins in cold storage (onions stored improperly)
    - T-60min: Prep station hygiene compliance drops
    - T-30min: Critical temperature threshold crossed
    - T-15min: Multiple zones affected
    - T-0: Outbreak conditions present
    """
    created = {"measurements": 0, "anomalies": 0}

    # Phase 1: Normal receiving (T-120 to T-100)
    for i in range(5):
        ts = (now - timedelta(minutes=120 - i * 4)).isoformat() + "Z"

        # Normal receiving temp
        m_ref = db.collection(meas_coll).document()
        m_ref.set(
            {
                "sensor_id": "rc-1",
                "sensor_type": "cold_storage_temperature",
                "measurement_type": "celsius",
                "measurement_value": 3.5 + random.uniform(-0.3, 0.3),
                "zone_id": "zone-recv-1",
                "store_id": "store-mcdonalds-1",
                "timestamp": ts,
            }
        )
        created["measurements"] += 1

    # Phase 2: Temperature drift begins (T-90 to T-30)
    base_temp = 4.0
    for i in range(15):
        ts = (now - timedelta(minutes=90 - i * 4)).isoformat() + "Z"

        # Gradual temperature rise in cold storage
        temp_value = base_temp + (i * 0.6) + random.uniform(-0.2, 0.2)

        m_ref = db.collection(meas_coll).document()
        m_data = {
            "sensor_id": "cs-1",
            "sensor_type": "cold_storage_temperature",
            "measurement_type": "celsius",
            "measurement_value": round(temp_value, 1),
            "zone_id": "zone-cold-1",
            "store_id": "store-mcdonalds-1",
            "timestamp": ts,
        }
        m_ref.set(m_data)
        created["measurements"] += 1

        # Generate anomalies when temp exceeds thresholds
        if temp_value > 5:
            severity = (
                "critical"
                if temp_value > 10
                else "high" if temp_value > 7 else "medium"
            )
            a_ref = db.collection(anom_coll).document()
            a_ref.set(
                {
                    "measurement_id": m_ref.id,
                    "sensor_id": "cs-1",
                    "sensor_type": "cold_storage_temperature",
                    "zone_id": "zone-cold-1",
                    "anomaly": "positive",
                    "severity": severity,
                    "score": min(0.99, 0.7 + (temp_value - 5) * 0.05),
                    "timestamp": ts,
                    "store_id": "store-mcdonalds-1",
                    "context": "Onion storage unit - potential contamination risk",
                }
            )
            created["anomalies"] += 1

    # Phase 3: Hygiene compliance drops (T-60 to T-20)
    for i in range(10):
        ts = (now - timedelta(minutes=60 - i * 4)).isoformat() + "Z"

        # Handwash events drop
        wash_value = 1 if i < 3 else 0  # Compliance drops

        m_ref = db.collection(meas_coll).document()
        m_data = {
            "sensor_id": "hw-1",
            "sensor_type": "handwash_station_usage",
            "measurement_type": "event",
            "measurement_value": wash_value,
            "zone_id": "zone-prep-1",
            "store_id": "store-mcdonalds-1",
            "timestamp": ts,
        }
        m_ref.set(m_data)
        created["measurements"] += 1

        # Generate hygiene anomalies
        if wash_value == 0 and i >= 3:
            a_ref = db.collection(anom_coll).document()
            a_ref.set(
                {
                    "measurement_id": m_ref.id,
                    "sensor_id": "hw-1",
                    "sensor_type": "handwash_station_usage",
                    "zone_id": "zone-prep-1",
                    "anomaly": "negative",
                    "severity": "high",
                    "score": 0.85 + random.uniform(0, 0.1),
                    "timestamp": ts,
                    "store_id": "store-mcdonalds-1",
                    "context": "Prep station handling onions - cross-contamination risk",
                }
            )
            created["anomalies"] += 1

    # Phase 4: Critical state (T-20 to T-0)
    for i in range(5):
        ts = (now - timedelta(minutes=20 - i * 4)).isoformat() + "Z"

        # Critical cold storage temp
        m_ref = db.collection(meas_coll).document()
        temp_value = 12.5 + random.uniform(-0.5, 1.0)
        m_ref.set(
            {
                "sensor_id": "cs-1",
                "sensor_type": "cold_storage_temperature",
                "measurement_type": "celsius",
                "measurement_value": round(temp_value, 1),
                "zone_id": "zone-cold-1",
                "store_id": "store-mcdonalds-1",
                "timestamp": ts,
            }
        )
        created["measurements"] += 1

        # Critical anomaly
        a_ref = db.collection(anom_coll).document()
        a_ref.set(
            {
                "measurement_id": m_ref.id,
                "sensor_id": "cs-1",
                "sensor_type": "cold_storage_temperature",
                "zone_id": "zone-cold-1",
                "anomaly": "positive",
                "severity": "critical",
                "score": 0.95 + random.uniform(0, 0.05),
                "timestamp": ts,
                "store_id": "store-mcdonalds-1",
                "context": "CRITICAL: Onion batch contamination likely - immediate action required",
            }
        )
        created["anomalies"] += 1

        # Secondary zone affected (prep)
        m_ref2 = db.collection(meas_coll).document()
        m_ref2.set(
            {
                "sensor_id": "pp-1",
                "sensor_type": "ingredient_flow",
                "measurement_type": "flow_rate",
                "measurement_value": 15 + random.randint(0, 5),
                "zone_id": "zone-prep-1",
                "store_id": "store-mcdonalds-1",
                "timestamp": ts,
                "ingredient": "diced_onions",
            }
        )
        created["measurements"] += 1

    return created


def seed_drift_scenario(db, meas_coll, anom_coll, now):
    """Simple temperature drift scenario."""
    created = {"measurements": 0, "anomalies": 0}

    sensors = [
        {
            "sensor_id": "cs-1",
            "sensor_type": "cold_storage_temperature",
            "measurement_type": "celsius",
            "zone_id": "zone-cold-1",
        },
        {
            "sensor_id": "hw-1",
            "sensor_type": "handwash_station_usage",
            "measurement_type": "event",
            "zone_id": "zone-wash-1",
        },
    ]

    for i in range(10):
        for sensor in sensors:
            ts = (now - timedelta(minutes=i * 2)).isoformat() + "Z"

            # Temperature rises for first 5 readings, then normalizes
            if sensor["sensor_type"] == "cold_storage_temperature":
                value = 12.5 - (i * 0.8) if i < 5 else 4.0 + random.uniform(-0.3, 0.3)
            else:
                value = 1

            m_ref = db.collection(meas_coll).document()
            m_ref.set(
                {
                    **sensor,
                    "measurement_value": (
                        round(value, 1) if isinstance(value, float) else value
                    ),
                    "timestamp": ts,
                    "store_id": "store-1",
                }
            )
            created["measurements"] += 1

            # Generate anomaly if temperature is high
            if sensor["sensor_type"] == "cold_storage_temperature" and value > 5:
                severity = (
                    "critical" if value > 10 else "high" if value > 7 else "medium"
                )
                a_ref = db.collection(anom_coll).document()
                a_ref.set(
                    {
                        "measurement_id": m_ref.id,
                        "sensor_id": sensor["sensor_id"],
                        "sensor_type": sensor["sensor_type"],
                        "zone_id": sensor["zone_id"],
                        "anomaly": "positive",
                        "severity": severity,
                        "score": 0.85 + random.random() * 0.15,
                        "timestamp": ts,
                        "store_id": "store-1",
                    }
                )
                created["anomalies"] += 1

    return created


def seed_hygiene_scenario(db, meas_coll, anom_coll, now):
    """Hygiene compliance failure scenario."""
    created = {"measurements": 0, "anomalies": 0}

    # Multiple handwash stations
    hw_sensors = [
        {"sensor_id": "hw-1", "zone_id": "zone-prep-1"},
        {"sensor_id": "hw-2", "zone_id": "zone-wash-1"},
    ]

    for i in range(12):
        ts = (now - timedelta(minutes=i * 3)).isoformat() + "Z"

        for sensor in hw_sensors:
            # Compliance drops for middle portion
            value = 0 if 3 <= i <= 8 else 1

            m_ref = db.collection(meas_coll).document()
            m_ref.set(
                {
                    "sensor_id": sensor["sensor_id"],
                    "sensor_type": "handwash_station_usage",
                    "measurement_type": "event",
                    "measurement_value": value,
                    "zone_id": sensor["zone_id"],
                    "timestamp": ts,
                    "store_id": "store-1",
                }
            )
            created["measurements"] += 1

            if value == 0:
                a_ref = db.collection(anom_coll).document()
                a_ref.set(
                    {
                        "measurement_id": m_ref.id,
                        "sensor_id": sensor["sensor_id"],
                        "sensor_type": "handwash_station_usage",
                        "zone_id": sensor["zone_id"],
                        "anomaly": "negative",
                        "severity": "high",
                        "score": 0.8 + random.random() * 0.15,
                        "timestamp": ts,
                        "store_id": "store-1",
                    }
                )
                created["anomalies"] += 1

    return created


def seed_recovery_scenario(db, meas_coll, anom_coll, now):
    """System recovering from incident."""
    created = {"measurements": 0, "anomalies": 0}

    # Temperature returning to normal
    for i in range(10):
        ts = (now - timedelta(minutes=i * 2)).isoformat() + "Z"

        # Temperature decreasing back to safe range
        temp_value = max(3.5, 8.0 - (i * 0.5)) + random.uniform(-0.2, 0.2)

        m_ref = db.collection(meas_coll).document()
        m_ref.set(
            {
                "sensor_id": "cs-1",
                "sensor_type": "cold_storage_temperature",
                "measurement_type": "celsius",
                "measurement_value": round(temp_value, 1),
                "zone_id": "zone-cold-1",
                "timestamp": ts,
                "store_id": "store-1",
            }
        )
        created["measurements"] += 1

        # Only create anomalies for still-elevated temps
        if temp_value > 5:
            a_ref = db.collection(anom_coll).document()
            a_ref.set(
                {
                    "measurement_id": m_ref.id,
                    "sensor_id": "cs-1",
                    "sensor_type": "cold_storage_temperature",
                    "zone_id": "zone-cold-1",
                    "anomaly": "positive",
                    "severity": "medium",
                    "score": 0.6 + (temp_value - 5) * 0.05,
                    "timestamp": ts,
                    "store_id": "store-1",
                }
            )
            created["anomalies"] += 1

        # Normal handwash compliance
        m_ref2 = db.collection(meas_coll).document()
        m_ref2.set(
            {
                "sensor_id": "hw-1",
                "sensor_type": "handwash_station_usage",
                "measurement_type": "event",
                "measurement_value": 1,
                "zone_id": "zone-prep-1",
                "timestamp": ts,
                "store_id": "store-1",
            }
        )
        created["measurements"] += 1

    return created


def seed_normal_scenario(db, meas_coll, anom_coll, now):
    """Normal healthy operations - baseline."""
    created = {"measurements": 0, "anomalies": 0}

    all_sensors = [
        {
            "sensor_id": "cs-1",
            "sensor_type": "cold_storage_temperature",
            "measurement_type": "celsius",
            "zone_id": "zone-cold-1",
            "base": 3.5,
        },
        {
            "sensor_id": "rc-1",
            "sensor_type": "cold_storage_temperature",
            "measurement_type": "celsius",
            "zone_id": "zone-recv-1",
            "base": 4.0,
        },
        {
            "sensor_id": "hw-1",
            "sensor_type": "handwash_station_usage",
            "measurement_type": "event",
            "zone_id": "zone-prep-1",
            "base": 1,
        },
        {
            "sensor_id": "hw-2",
            "sensor_type": "handwash_station_usage",
            "measurement_type": "event",
            "zone_id": "zone-wash-1",
            "base": 1,
        },
        {
            "sensor_id": "ck-1",
            "sensor_type": "cook_temp",
            "measurement_type": "celsius",
            "zone_id": "zone-cook-1",
            "base": 165,
        },
    ]

    for i in range(8):
        ts = (now - timedelta(minutes=i * 3)).isoformat() + "Z"

        for sensor in all_sensors:
            base = sensor["base"]
            if sensor["measurement_type"] == "celsius":
                value = base + random.uniform(-0.5, 0.5)
            else:
                value = base

            m_ref = db.collection(meas_coll).document()
            m_ref.set(
                {
                    "sensor_id": sensor["sensor_id"],
                    "sensor_type": sensor["sensor_type"],
                    "measurement_type": sensor["measurement_type"],
                    "measurement_value": (
                        round(value, 1) if isinstance(value, float) else value
                    ),
                    "zone_id": sensor["zone_id"],
                    "timestamp": ts,
                    "store_id": "store-1",
                }
            )
            created["measurements"] += 1

    return created
