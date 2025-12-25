from datetime import datetime

from flask import jsonify, request

try:
    from google.api_core.exceptions import FailedPrecondition
except Exception:  # pragma: no cover

    class FailedPrecondition(Exception):
        pass


from .utils import select_latest_by


def register(
    app, db, anomalies_collection: str, measurements_collection: str, firestore_mod
):
    @app.route("/anomalies/recent", methods=["GET"])
    def recent_anomalies():
        ref = (
            db.collection(anomalies_collection)
            .order_by("timestamp", direction=firestore_mod.Query.DESCENDING)
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

    @app.route("/anomalies/aggregate", methods=["GET"])
    def anomalies_aggregate():
        sensor_id = request.args.get("sensor_id")
        sensor_type = request.args.get("sensor_type")
        anomaly_label = request.args.get("anomaly")

        query = db.collection(anomalies_collection)
        if sensor_id:
            query = query.where("sensor_id", "==", sensor_id)
        if sensor_type:
            query = query.where("sensor_type", "==", sensor_type)
        if anomaly_label:
            query = query.where("anomaly", "==", anomaly_label)

        try:
            count = sum(1 for _ in query.stream())
            return jsonify({"count": count})
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/anomalies/by-sensor", methods=["GET"])
    def anomalies_by_sensor():
        sensor_id = request.args.get("sensor_id")
        results = []

        anomaly_query = db.collection(anomalies_collection)
        if sensor_id:
            anomaly_query = anomaly_query.where("sensor_id", "==", sensor_id)

        for doc in anomaly_query.stream():
            anomaly = doc.to_dict()
            meas_id = anomaly.get("measurement_id")
            measurement = None
            if meas_id:
                m = db.collection(measurements_collection).document(meas_id).get()
                measurement = m.to_dict() if m.exists else None
            results.append({"anomaly": anomaly, "measurement": measurement})

        return jsonify({"results": results})

    @app.route("/anomalies/time-series", methods=["GET"])
    def anomalies_time_series():
        sensor_id = request.args.get("sensor_id")
        sensor_type = request.args.get("sensor_type")
        start = request.args.get("start")
        end = request.args.get("end")
        granularity = request.args.get("granularity", "day").lower()
        anomaly_label = request.args.get("anomaly")

        base_query = db.collection(anomalies_collection)
        if sensor_id:
            base_query = base_query.where("sensor_id", "==", sensor_id)
        if sensor_type:
            base_query = base_query.where("sensor_type", "==", sensor_type)
        if anomaly_label:
            base_query = base_query.where("anomaly", "==", anomaly_label)

        def to_dt(val: str):
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                return None

        def bucket_key(ts_val: str):
            ts = to_dt(ts_val)
            if not ts:
                return None
            if granularity == "hour":
                return ts.strftime("%Y-%m-%d %H:00")
            if granularity == "minute":
                return ts.strftime("%Y-%m-%d %H:%M")
            if granularity == "week":
                year, week, _ = ts.isocalendar()
                return f"{year}-W{week:02d}"
            return ts.strftime("%Y-%m-%d")  # default day

        start_dt = to_dt(start) if start else None
        end_dt = to_dt(end) if end else None

        try:
            query = base_query
            if start:
                query = query.where("timestamp", ">=", start)
            if end:
                query = query.where("timestamp", "<=", end)
            query = query.order_by("timestamp")

            buckets = {}
            for doc in query.stream():
                data = doc.to_dict() or {}
                ts = data.get("timestamp")
                if not ts:
                    continue
                key = bucket_key(ts)
                if not key:
                    continue
                buckets[key] = buckets.get(key, 0) + 1

            series = [{"bucket": d, "count": buckets[d]} for d in sorted(buckets)]
            return jsonify({"series": series})
        except FailedPrecondition:
            # Fallback: stream base query and filter by time in memory
            buckets = {}
            for doc in base_query.stream():
                data = doc.to_dict() or {}
                ts_val = data.get("timestamp")
                ts = to_dt(ts_val) if ts_val else None
                if start_dt and (not ts or ts < start_dt):
                    continue
                if end_dt and (not ts or ts > end_dt):
                    continue
                if not ts:
                    continue
                key = bucket_key(ts_val)
                if not key:
                    continue
                buckets[key] = buckets.get(key, 0) + 1
            series = [{"bucket": d, "count": buckets[d]} for d in sorted(buckets)]
            return jsonify({"series": series, "note": "fallback without index"})
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
