"""Kafka metrics and status endpoints - Scenario-aware for demo mode."""

import os
from datetime import datetime, timedelta
from flask import jsonify, request

# Topic configuration matching Confluent setup
KAFKA_TOPICS = [
    "sensor-physical-cold-storage-temperature",
    "sensor-physical-ambient-kitchen-temperature",
    "sensor-physical-humidity",
    "sensor-physical-time-out-of-range-duration",
    "sensor-operational-handwash-station-usage",
    "sensor-operational-delivery-arrival",
    "sensor-operational-shift-change",
    "sensor-events-processed",
]

# Scenario-specific metrics for demo mode
SCENARIO_METRICS = {
    "ecoli": {
        "overview": {
            "total_messages_per_second": 12.5,
            "messages_last_minute": 750,
            "messages_last_5_minutes": 3750,
            "active_topics": 8,
            "total_topics": 8,
        },
        "topics": [
            {
                "topic": "sensor-physical-cold-storage-temperature",
                "category": "physical",
                "messages_per_second": 4.2,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-ambient-kitchen-temperature",
                "category": "physical",
                "messages_per_second": 2.1,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-humidity",
                "category": "physical",
                "messages_per_second": 1.5,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-time-out-of-range-duration",
                "category": "physical",
                "messages_per_second": 0.8,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-handwash-station-usage",
                "category": "operational",
                "messages_per_second": 1.2,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-delivery-arrival",
                "category": "operational",
                "messages_per_second": 0.3,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-shift-change",
                "category": "operational",
                "messages_per_second": 0.1,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-events-processed",
                "category": "processed",
                "messages_per_second": 2.3,
                "partitions": 1,
                "status": "active",
            },
        ],
        "consumer_groups": [
            {
                "group_id": "sensor-consumer",
                "state": "Stable",
                "members": 1,
                "lag": 12,
                "topics": ["sensor-physical-*", "sensor-operational-*"],
            },
            {
                "group_id": "anomaly-processor",
                "state": "Stable",
                "members": 1,
                "lag": 3,
                "topics": ["sensor-events-processed"],
            },
        ],
        "pipeline": {
            "producer": {"status": "running", "service": "freshr-producer"},
            "consumer": {"status": "running", "service": "freshr-consumer"},
            "processor": {"status": "running", "service": "freshr-processing"},
        },
    },
    "drift": {
        "overview": {
            "total_messages_per_second": 8.2,
            "messages_last_minute": 492,
            "messages_last_5_minutes": 2460,
            "active_topics": 6,
            "total_topics": 8,
        },
        "topics": [
            {
                "topic": "sensor-physical-cold-storage-temperature",
                "category": "physical",
                "messages_per_second": 5.8,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-ambient-kitchen-temperature",
                "category": "physical",
                "messages_per_second": 1.2,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-humidity",
                "category": "physical",
                "messages_per_second": 0.5,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-time-out-of-range-duration",
                "category": "physical",
                "messages_per_second": 0.2,
                "partitions": 1,
                "status": "idle",
            },
            {
                "topic": "sensor-operational-handwash-station-usage",
                "category": "operational",
                "messages_per_second": 0.3,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-delivery-arrival",
                "category": "operational",
                "messages_per_second": 0.1,
                "partitions": 1,
                "status": "idle",
            },
            {
                "topic": "sensor-operational-shift-change",
                "category": "operational",
                "messages_per_second": 0.0,
                "partitions": 1,
                "status": "idle",
            },
            {
                "topic": "sensor-events-processed",
                "category": "processed",
                "messages_per_second": 0.1,
                "partitions": 1,
                "status": "active",
            },
        ],
        "consumer_groups": [
            {
                "group_id": "sensor-consumer",
                "state": "Stable",
                "members": 1,
                "lag": 5,
                "topics": ["sensor-physical-*", "sensor-operational-*"],
            },
            {
                "group_id": "anomaly-processor",
                "state": "Stable",
                "members": 1,
                "lag": 0,
                "topics": ["sensor-events-processed"],
            },
        ],
        "pipeline": {
            "producer": {"status": "running", "service": "freshr-producer"},
            "consumer": {"status": "running", "service": "freshr-consumer"},
            "processor": {"status": "running", "service": "freshr-processing"},
        },
    },
    "hygiene": {
        "overview": {
            "total_messages_per_second": 6.4,
            "messages_last_minute": 384,
            "messages_last_5_minutes": 1920,
            "active_topics": 5,
            "total_topics": 8,
        },
        "topics": [
            {
                "topic": "sensor-physical-cold-storage-temperature",
                "category": "physical",
                "messages_per_second": 1.0,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-ambient-kitchen-temperature",
                "category": "physical",
                "messages_per_second": 0.8,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-humidity",
                "category": "physical",
                "messages_per_second": 0.4,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-time-out-of-range-duration",
                "category": "physical",
                "messages_per_second": 0.0,
                "partitions": 1,
                "status": "idle",
            },
            {
                "topic": "sensor-operational-handwash-station-usage",
                "category": "operational",
                "messages_per_second": 3.5,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-delivery-arrival",
                "category": "operational",
                "messages_per_second": 0.2,
                "partitions": 1,
                "status": "idle",
            },
            {
                "topic": "sensor-operational-shift-change",
                "category": "operational",
                "messages_per_second": 0.1,
                "partitions": 1,
                "status": "idle",
            },
            {
                "topic": "sensor-events-processed",
                "category": "processed",
                "messages_per_second": 0.4,
                "partitions": 1,
                "status": "active",
            },
        ],
        "consumer_groups": [
            {
                "group_id": "sensor-consumer",
                "state": "Stable",
                "members": 1,
                "lag": 8,
                "topics": ["sensor-physical-*", "sensor-operational-*"],
            },
            {
                "group_id": "anomaly-processor",
                "state": "Stable",
                "members": 1,
                "lag": 2,
                "topics": ["sensor-events-processed"],
            },
        ],
        "pipeline": {
            "producer": {"status": "running", "service": "freshr-producer"},
            "consumer": {"status": "running", "service": "freshr-consumer"},
            "processor": {"status": "running", "service": "freshr-processing"},
        },
    },
    "recovery": {
        "overview": {
            "total_messages_per_second": 4.8,
            "messages_last_minute": 288,
            "messages_last_5_minutes": 1440,
            "active_topics": 7,
            "total_topics": 8,
        },
        "topics": [
            {
                "topic": "sensor-physical-cold-storage-temperature",
                "category": "physical",
                "messages_per_second": 1.5,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-ambient-kitchen-temperature",
                "category": "physical",
                "messages_per_second": 0.8,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-humidity",
                "category": "physical",
                "messages_per_second": 0.5,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-time-out-of-range-duration",
                "category": "physical",
                "messages_per_second": 0.1,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-handwash-station-usage",
                "category": "operational",
                "messages_per_second": 0.9,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-delivery-arrival",
                "category": "operational",
                "messages_per_second": 0.3,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-shift-change",
                "category": "operational",
                "messages_per_second": 0.1,
                "partitions": 1,
                "status": "idle",
            },
            {
                "topic": "sensor-events-processed",
                "category": "processed",
                "messages_per_second": 0.6,
                "partitions": 1,
                "status": "active",
            },
        ],
        "consumer_groups": [
            {
                "group_id": "sensor-consumer",
                "state": "Stable",
                "members": 1,
                "lag": 0,
                "topics": ["sensor-physical-*", "sensor-operational-*"],
            },
            {
                "group_id": "anomaly-processor",
                "state": "Stable",
                "members": 1,
                "lag": 0,
                "topics": ["sensor-events-processed"],
            },
        ],
        "pipeline": {
            "producer": {"status": "running", "service": "freshr-producer"},
            "consumer": {"status": "running", "service": "freshr-consumer"},
            "processor": {"status": "running", "service": "freshr-processing"},
        },
    },
    "normal": {
        "overview": {
            "total_messages_per_second": 3.2,
            "messages_last_minute": 192,
            "messages_last_5_minutes": 960,
            "active_topics": 8,
            "total_topics": 8,
        },
        "topics": [
            {
                "topic": "sensor-physical-cold-storage-temperature",
                "category": "physical",
                "messages_per_second": 0.8,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-ambient-kitchen-temperature",
                "category": "physical",
                "messages_per_second": 0.6,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-humidity",
                "category": "physical",
                "messages_per_second": 0.4,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-physical-time-out-of-range-duration",
                "category": "physical",
                "messages_per_second": 0.2,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-handwash-station-usage",
                "category": "operational",
                "messages_per_second": 0.5,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-delivery-arrival",
                "category": "operational",
                "messages_per_second": 0.3,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-operational-shift-change",
                "category": "operational",
                "messages_per_second": 0.1,
                "partitions": 1,
                "status": "active",
            },
            {
                "topic": "sensor-events-processed",
                "category": "processed",
                "messages_per_second": 0.3,
                "partitions": 1,
                "status": "active",
            },
        ],
        "consumer_groups": [
            {
                "group_id": "sensor-consumer",
                "state": "Stable",
                "members": 1,
                "lag": 0,
                "topics": ["sensor-physical-*", "sensor-operational-*"],
            },
            {
                "group_id": "anomaly-processor",
                "state": "Stable",
                "members": 1,
                "lag": 0,
                "topics": ["sensor-events-processed"],
            },
        ],
        "pipeline": {
            "producer": {"status": "running", "service": "freshr-producer"},
            "consumer": {"status": "running", "service": "freshr-consumer"},
            "processor": {"status": "running", "service": "freshr-processing"},
        },
    },
}

# Try to import confluent_kafka for real metrics
try:
    from confluent_kafka.admin import AdminClient, ClusterMetadata

    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False


def get_admin_client():
    """Create Kafka AdminClient if credentials available."""
    bootstrap = os.getenv("KAFKA_BOOTSTRAP")
    if not bootstrap:
        return None

    conf = {
        "bootstrap.servers": bootstrap,
        "security.protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
        "sasl.mechanism": os.getenv("KAFKA_SASL_MECHANISM"),
        "sasl.username": os.getenv("KAFKA_SASL_USERNAME"),
        "sasl.password": os.getenv("KAFKA_SASL_PASSWORD"),
    }
    conf = {k: v for k, v in conf.items() if v is not None}

    try:
        return AdminClient(conf)
    except Exception as e:
        print(f"Failed to create AdminClient: {e}")
        return None


def get_topic_category(topic_name: str) -> str:
    """Categorize topic by name."""
    if "physical" in topic_name:
        return "physical"
    elif "operational" in topic_name:
        return "operational"
    elif "processed" in topic_name:
        return "processed"
    elif "price" in topic_name:
        return "pricing"
    return "other"


def register(app, db, measurements_collection: str):
    """Register Kafka routes."""

    @app.route("/kafka/status", methods=["GET"])
    def kafka_status():
        """Get Kafka cluster connection status."""
        scenario = request.args.get("scenario")

        # In demo mode, always report connected
        if scenario and scenario in SCENARIO_METRICS:
            return jsonify(
                {
                    "connected": True,
                    "cluster_id": "lkc-freshr-demo",
                    "broker_count": 3,
                    "bootstrap_server": "pkc-demo.us-east1.gcp.confluent.cloud:9092",
                    "environment": "Confluent Cloud",
                    "security_protocol": "SASL_SSL",
                    "error": None,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
            )

        # Try real connection
        bootstrap = os.getenv("KAFKA_BOOTSTRAP", "")
        connected = False
        cluster_id = None
        broker_count = 0
        error_message = None

        if KAFKA_AVAILABLE and bootstrap:
            admin = get_admin_client()
            if admin:
                try:
                    metadata: ClusterMetadata = admin.list_topics(timeout=5)
                    connected = True
                    cluster_id = metadata.cluster_id
                    broker_count = len(metadata.brokers)
                except Exception as e:
                    error_message = str(e)

        is_confluent_cloud = "confluent.cloud" in bootstrap

        return jsonify(
            {
                "connected": connected,
                "cluster_id": cluster_id or "cluster_0",
                "broker_count": broker_count or 1,
                "bootstrap_server": bootstrap.split(",")[0] if bootstrap else None,
                "environment": "Confluent Cloud" if is_confluent_cloud else "Local",
                "security_protocol": os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
                "error": error_message,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        )

    @app.route("/kafka/topics", methods=["GET"])
    def kafka_topics():
        """List Kafka topics with partition info."""
        scenario = request.args.get("scenario")

        # In demo mode, return scenario topics
        if scenario and scenario in SCENARIO_METRICS:
            topics = [
                {
                    "name": t["topic"],
                    "partitions": t["partitions"],
                    "category": t["category"],
                }
                for t in SCENARIO_METRICS[scenario]["topics"]
            ]
            return jsonify({"topics": topics, "count": len(topics)})

        topics = []
        if KAFKA_AVAILABLE:
            admin = get_admin_client()
            if admin:
                try:
                    metadata = admin.list_topics(timeout=5)
                    for topic_name, topic_meta in metadata.topics.items():
                        if topic_name.startswith("sensor-") or topic_name in [
                            "price-events",
                            "price-events-processed",
                        ]:
                            topics.append(
                                {
                                    "name": topic_name,
                                    "partitions": len(topic_meta.partitions),
                                    "category": get_topic_category(topic_name),
                                }
                            )
                except Exception as e:
                    print(f"Failed to list topics: {e}")

        if not topics:
            topics = [
                {"name": t, "partitions": 1, "category": get_topic_category(t)}
                for t in KAFKA_TOPICS
            ]

        return jsonify(
            {"topics": sorted(topics, key=lambda x: x["name"]), "count": len(topics)}
        )

    @app.route("/kafka/metrics", methods=["GET"])
    def kafka_metrics():
        """Get Kafka streaming metrics. Supports scenario param for demo mode."""
        scenario = request.args.get("scenario")
        now = datetime.utcnow()

        # Return scenario-specific metrics in demo mode
        if scenario and scenario in SCENARIO_METRICS:
            metrics = SCENARIO_METRICS[scenario].copy()
            metrics["timestamp"] = now.isoformat() + "Z"
            return jsonify(metrics)

        # Fallback to Firestore-based metrics
        one_minute_ago = now - timedelta(minutes=1)
        five_minutes_ago = now - timedelta(minutes=5)

        try:
            recent_query = (
                db.collection(measurements_collection)
                .where("timestamp", ">=", one_minute_ago.isoformat() + "Z")
                .stream()
            )
            messages_last_minute = sum(1 for _ in recent_query)

            five_min_query = (
                db.collection(measurements_collection)
                .where("timestamp", ">=", five_minutes_ago.isoformat() + "Z")
                .stream()
            )
            messages_last_5min = sum(1 for _ in five_min_query)
            messages_per_second = round(messages_last_5min / 300, 2)

        except Exception as e:
            print(f"Firestore query error: {e}")
            messages_last_minute = 0
            messages_last_5min = 0
            messages_per_second = 0

        topic_metrics = []
        for topic in KAFKA_TOPICS:
            category = get_topic_category(topic)
            weight = (
                0.6
                if category == "physical"
                else 0.3 if category == "operational" else 0.1
            )
            estimated_rate = round(messages_per_second * weight, 2)
            topic_metrics.append(
                {
                    "topic": topic,
                    "category": category,
                    "messages_per_second": estimated_rate,
                    "partitions": 1,
                    "status": "active" if estimated_rate > 0 else "idle",
                }
            )

        consumer_groups = [
            {
                "group_id": "sensor-consumer",
                "state": "Stable",
                "members": 1,
                "lag": max(0, messages_last_minute - messages_last_5min // 5),
                "topics": ["sensor-physical-*", "sensor-operational-*"],
            },
            {
                "group_id": "anomaly-processor",
                "state": "Stable",
                "members": 1,
                "lag": 0,
                "topics": ["sensor-events-processed"],
            },
        ]

        return jsonify(
            {
                "overview": {
                    "total_messages_per_second": messages_per_second,
                    "messages_last_minute": messages_last_minute,
                    "messages_last_5_minutes": messages_last_5min,
                    "active_topics": sum(
                        1 for t in topic_metrics if t["status"] == "active"
                    ),
                    "total_topics": len(KAFKA_TOPICS),
                },
                "topics": topic_metrics,
                "consumer_groups": consumer_groups,
                "pipeline": {
                    "producer": {
                        "status": "running" if messages_per_second > 0 else "idle",
                        "service": "freshr-producer",
                    },
                    "consumer": {
                        "status": "running" if messages_per_second > 0 else "idle",
                        "service": "freshr-consumer",
                    },
                    "processor": {
                        "status": "running" if messages_per_second > 0 else "idle",
                        "service": "freshr-processing",
                    },
                },
                "timestamp": now.isoformat() + "Z",
            }
        )

    @app.route("/kafka/pipeline", methods=["GET"])
    def kafka_pipeline():
        """Get pipeline stage details."""
        return jsonify(
            {
                "stages": [
                    {
                        "id": "sensors",
                        "name": "Kitchen Sensors",
                        "type": "source",
                        "status": "active",
                        "outputs": ["sensor-physical-*", "sensor-operational-*"],
                    },
                    {
                        "id": "producer",
                        "name": "Kafka Producer",
                        "type": "producer",
                        "service": "freshr-producer",
                        "status": "running",
                        "outputs": KAFKA_TOPICS[:7],
                    },
                    {
                        "id": "consumer",
                        "name": "Kafka Consumer",
                        "type": "consumer",
                        "service": "freshr-consumer",
                        "status": "running",
                        "inputs": KAFKA_TOPICS[:7],
                        "outputs": ["sensor-events-processed", "Firestore"],
                    },
                    {
                        "id": "processor",
                        "name": "Anomaly Processor",
                        "type": "processor",
                        "service": "freshr-processing",
                        "status": "running",
                        "inputs": ["sensor-events-processed"],
                        "outputs": ["anomalies collection"],
                    },
                    {
                        "id": "api",
                        "name": "Freshr API",
                        "type": "api",
                        "service": "freshr-api",
                        "status": "running",
                        "inputs": ["Firestore"],
                    },
                ],
                "connections": [
                    {"from": "sensors", "to": "producer"},
                    {"from": "producer", "to": "consumer"},
                    {"from": "consumer", "to": "processor"},
                    {"from": "processor", "to": "api"},
                ],
            }
        )
