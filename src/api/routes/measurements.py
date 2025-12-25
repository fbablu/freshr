from datetime import datetime

from flask import jsonify, request
from google.cloud import firestore

try:
    from google.api_core.exceptions import FailedPrecondition
except Exception:  # pragma: no cover

    class FailedPrecondition(Exception):
        pass


from .utils import parse_time_param, select_latest_by


def register(app, db, collection_name: str):
    @app.route("/measurements/recent", methods=["GET"])
    def recent_measurements():
        ref = (
            db.collection(collection_name)
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

    @app.route("/measurements/count", methods=["GET"])
    def measurements_count():
        start = parse_time_param("start")
        end = parse_time_param("end")
        sensor_id = request.args.get("sensor_id")
        sensor_type = request.args.get("sensor_type")

        base_query = db.collection(collection_name)
        if sensor_id:
            base_query = base_query.where("sensor_id", "==", sensor_id)
        if sensor_type:
            base_query = base_query.where("sensor_type", "==", sensor_type)

        try:
            query = base_query
            if start:
                query = query.where("timestamp", ">=", start)
            if end:
                query = query.where("timestamp", "<=", end)
            query = query.order_by("timestamp")
            count = sum(1 for _ in query.stream())
            return jsonify({"count": count})
        except FailedPrecondition:
            # Fallback: stream base query and filter timestamps in memory to avoid index requirement.
            def to_dt(val: str):
                try:
                    return datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    return None

            start_dt = to_dt(start) if start else None
            end_dt = to_dt(end) if end else None

            c = 0
            for doc in base_query.stream():
                data = doc.to_dict() or {}
                ts = to_dt(data.get("timestamp", ""))
                if start_dt and (not ts or ts < start_dt):
                    continue
                if end_dt and (not ts or ts > end_dt):
                    continue
                c += 1
            return jsonify({"count": c, "note": "fallback without index"}), 200
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/measurements/measurement-type", methods=["GET"])
    def measurement_type():
        sensor_id = request.args.get("sensor_id")
        if not sensor_id:
            return jsonify({"error": "sensor_id is required"}), 400
        query = (
            db.collection(collection_name)
            .where("sensor_id", "==", sensor_id)
            .limit(1)
            .stream()
        )
        for doc in query:
            data = doc.to_dict()
            return jsonify(
                {
                    "sensor_id": sensor_id,
                    "sensor_type": data.get("sensor_type"),
                    "measurement_type": data.get("measurement_type"),
                }
            )
        return jsonify({"sensor_id": sensor_id, "measurement_type": None}), 404

    @app.route("/measurements/time-series", methods=["GET"])
    def measurements_time_series():
        sensor_id = request.args.get("sensor_id")
        sensor_type = request.args.get("sensor_type")
        start = parse_time_param("start")
        end = parse_time_param("end")
        granularity = request.args.get("granularity", "day").lower()

        base_query = db.collection(collection_name)
        if sensor_id:
            base_query = base_query.where("sensor_id", "==", sensor_id)
        if sensor_type:
            base_query = base_query.where("sensor_type", "==", sensor_type)

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
            return ts.strftime("%Y-%m-%d")

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
                ts_val = data.get("timestamp")
                key = bucket_key(ts_val) if ts_val else None
                if not key:
                    continue
                buckets.setdefault(key, []).append(
                    {
                        "timestamp": ts_val,
                        "sensor_id": data.get("sensor_id"),
                        "sensor_type": data.get("sensor_type"),
                        "measurement_type": data.get("measurement_type"),
                        "measurement_value": data.get("measurement_value"),
                    }
                )

            series = [
                {"bucket": d, "count": len(buckets[d]), "values": buckets[d]}
                for d in sorted(buckets)
            ]
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
                buckets.setdefault(key, []).append(
                    {
                        "timestamp": ts_val,
                        "sensor_id": data.get("sensor_id"),
                        "sensor_type": data.get("sensor_type"),
                        "measurement_type": data.get("measurement_type"),
                        "measurement_value": data.get("measurement_value"),
                    }
                )
            series = [
                {"bucket": d, "count": len(buckets[d]), "values": buckets[d]}
                for d in sorted(buckets)
            ]
            return jsonify({"series": series, "note": "fallback without index"})
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/measurements/values", methods=["GET"])
    def measurements_values():
        sensor_id = request.args.get("sensor_id")
        sensor_type = request.args.get("sensor_type")
        start = parse_time_param("start")
        end = parse_time_param("end")
        limit = int(request.args.get("limit", "100"))

        base_query = db.collection(collection_name)
        if sensor_id:
            base_query = base_query.where("sensor_id", "==", sensor_id)
        if sensor_type:
            base_query = base_query.where("sensor_type", "==", sensor_type)

        def to_dt(val: str):
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                return None

        start_dt = to_dt(start) if start else None
        end_dt = to_dt(end) if end else None

        try:
            query = base_query
            if start:
                query = query.where("timestamp", ">=", start)
            if end:
                query = query.where("timestamp", "<=", end)
            query = query.order_by("timestamp")
            query = query.limit(limit)

            items = []
            for doc in query.stream():
                data = doc.to_dict() or {}
                data["id"] = doc.id
                items.append(data)
            return jsonify({"measurements": items})
        except FailedPrecondition:
            # Fallback without index: stream base and filter in memory
            items = []
            for doc in base_query.stream():
                data = doc.to_dict() or {}
                ts_val = data.get("timestamp")
                ts = to_dt(ts_val) if ts_val else None
                if start_dt and (not ts or ts < start_dt):
                    continue
                if end_dt and (not ts or ts > end_dt):
                    continue
                data["id"] = doc.id
                items.append(data)
                if len(items) >= limit:
                    break
            return jsonify({"measurements": items, "note": "fallback without index"})
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
