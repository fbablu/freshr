from flask import jsonify, request
from datetime import datetime, timedelta
import random

def register(app, db, measurements_collection, anomalies_collection):
    @app.route("/seed", methods=["POST"])
    def seed_data():
        """Seed test data for demo"""
        scenario = request.args.get("scenario", "drift")
        
        sensors = [
            {"sensor_id": "cs-1", "sensor_type": "cold_storage_temperature", "measurement_type": "celsius", "zone_id": "zone-cold-1"},
            {"sensor_id": "hw-1", "sensor_type": "handwash_station_usage", "measurement_type": "event", "zone_id": "zone-wash-1"},
            {"sensor_id": "hw-2", "sensor_type": "handwash_station_usage", "measurement_type": "event", "zone_id": "zone-prep-1"},
        ]
        
        now = datetime.utcnow()
        created = []
        
        for i in range(10):
            for sensor in sensors:
                ts = (now - timedelta(minutes=i*2)).isoformat() + "Z"
                
                # Scenario-based values
                if scenario == "drift" and sensor["sensor_type"] == "cold_storage_temperature":
                    value = 12.5 - (i * 0.5) if i < 5 else 4.0
                elif scenario == "hygiene" and "handwash" in sensor["sensor_type"]:
                    value = 0 if i < 3 else 1
                else:
                    value = 4.0 if "temperature" in sensor["sensor_type"] else 1
                
                # Add measurement
                m_ref = db.collection(measurements_collection).document()
                m_data = {
                    **sensor,
                    "measurement_value": value,
                    "timestamp": ts,
                    "store_id": "store-1"
                }
                m_ref.set(m_data)
                
                # Add anomaly if bad value
                is_anomaly = (
                    (sensor["sensor_type"] == "cold_storage_temperature" and value > 5) or
                    (sensor["sensor_type"] == "handwash_station_usage" and value == 0)
                )
                
                if is_anomaly:
                    a_ref = db.collection(anomalies_collection).document()
                    severity = "critical" if value > 10 else "high" if value > 7 else "medium"
                    a_ref.set({
                        "measurement_id": m_ref.id,
                        "sensor_id": sensor["sensor_id"],
                        "sensor_type": sensor["sensor_type"],
                        "zone_id": sensor["zone_id"],
                        "anomaly": "positive",
                        "severity": severity,
                        "score": 0.85 + random.random() * 0.15,
                        "timestamp": ts,
                        "store_id": "store-1"
                    })
                    created.append({"type": "anomaly", "sensor": sensor["sensor_id"]})
                
                created.append({"type": "measurement", "sensor": sensor["sensor_id"]})
        
        return jsonify({"created": len(created), "scenario": scenario})