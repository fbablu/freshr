from flask import jsonify


def register(app, db, collection_name: str):
    @app.route("/devices", methods=["GET"])
    def devices():
        seen = {}
        for doc in db.collection(collection_name).stream():
            data = doc.to_dict()
            sid = data.get("sensor_id")
            if not sid or sid in seen:
                continue
            seen[sid] = {
                "sensor_id": sid,
                "sensor_type": data.get("sensor_type"),
                "measurement_type": data.get("measurement_type"),
            }
        return jsonify({"devices": list(seen.values())})
