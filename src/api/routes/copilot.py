import os
import json
from flask import jsonify, request

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel

    VERTEX_AVAILABLE = True
except ImportError:
    VERTEX_AVAILABLE = False


# Pre-built explanations for demo reliability (fallback if Gemini unavailable)
FALLBACK_EXPLANATIONS = {
    "cold_storage_temperature": {
        "what_happened": "Cold storage temperature exceeded safe threshold of 5°C. The sensor detected a sustained rise indicating potential refrigeration failure or door left open.",
        "why_it_matters": "Temperatures above 5°C allow rapid bacterial growth including E. coli, Salmonella, and Listeria. The FDA requires cold storage below 40°F (4.4°C). Every hour above threshold doubles contamination risk.",
        "what_to_do": [
            "HOLD all affected inventory immediately",
            "Check compressor and door seals",
            "Verify temperature with backup thermometer",
            "If >2 hours above 5°C, discard perishables per HACCP protocol",
            "Document incident for health inspection records",
        ],
        "confirm_recovery": "Temperature must return below 4°C and remain stable for 30+ minutes. Verify with manual spot-check before releasing held inventory.",
    },
    "handwash_station_usage": {
        "what_happened": "Handwash compliance dropped below required frequency. Station sensors detected insufficient wash events relative to food handling activities in this zone.",
        "why_it_matters": "Hand hygiene prevents 70% of foodborne illness transmission. CDC estimates improper handwashing causes 40% of restaurant outbreaks. Cross-contamination from hands to food is the #1 vector.",
        "what_to_do": [
            "Immediate verbal reminder to all staff in zone",
            "Verify soap and paper towel supplies",
            "Spot-check hand sanitizer stations",
            "Brief refresher on wash timing requirements",
            "Consider buddy-system accountability",
        ],
        "confirm_recovery": "Resume normal wash frequency (minimum every 30 min during active prep). Log compliance for remainder of shift.",
    },
    "humidity": {
        "what_happened": "Kitchen humidity exceeded optimal range. High moisture levels detected in food preparation or storage areas.",
        "why_it_matters": "Humidity above 60% accelerates mold growth and bacterial proliferation. Condensation can drip onto food surfaces causing direct contamination.",
        "what_to_do": [
            "Check HVAC and ventilation systems",
            "Inspect for water leaks or spills",
            "Increase air circulation in affected zone",
            "Cover exposed ingredients",
            "Wipe down condensation from surfaces",
        ],
        "confirm_recovery": "Humidity returns to 40-60% range and remains stable. No visible condensation on surfaces.",
    },
    "default": {
        "what_happened": "Anomaly detected in kitchen operations. Sensor readings deviated significantly from normal operating parameters.",
        "why_it_matters": "Deviations from normal conditions indicate potential food safety risks that require immediate attention to prevent contamination.",
        "what_to_do": [
            "Investigate the affected zone immediately",
            "Check equipment and environmental conditions",
            "Document findings",
            "Take corrective action as needed",
        ],
        "confirm_recovery": "All readings return to normal range and remain stable for monitoring period.",
    },
}


def get_gemini_explanation(anomaly_data: dict, measurement_data: dict) -> dict:
    """Call Gemini to generate contextual explanation."""
    if not VERTEX_AVAILABLE:
        return None

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "rich-archery-482201-b6")
    location = os.getenv("VERTEX_REGION", "us-central1")

    try:
        vertexai.init(project=project_id, location=location)
        model = GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are a food safety expert AI assistant for restaurant kitchens. 
Analyze this anomaly and provide a structured explanation.

ANOMALY DATA:
- Sensor Type: {anomaly_data.get('sensor_type', 'unknown')}
- Severity: {anomaly_data.get('severity', 'medium')}
- Zone: {measurement_data.get('zone_id', 'unknown')}
- Current Value: {measurement_data.get('measurement_value', 'N/A')} {measurement_data.get('measurement_type', '')}
- Timestamp: {anomaly_data.get('timestamp', 'unknown')}

Respond in this exact JSON format:
{{
    "what_happened": "One paragraph explaining what the sensor detected",
    "why_it_matters": "One paragraph on food safety implications with specific bacteria/risks",
    "what_to_do": ["Action 1", "Action 2", "Action 3", "Action 4"],
    "confirm_recovery": "How to verify the issue is resolved"
}}

Be specific, actionable, and reference FDA/HACCP guidelines where relevant."""

        response = model.generate_content(prompt)

        # Parse JSON from response
        text = response.text.strip()
        # Handle markdown code blocks
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        return json.loads(text)

    except Exception as e:
        print(f"Gemini API error: {e}")
        return None


def register(app, db, anomalies_collection: str, measurements_collection: str):
    """Register copilot routes."""

    @app.route("/copilot/explain", methods=["POST"])
    def explain_anomaly():
        """Generate AI explanation for an anomaly."""
        data = request.get_json() or {}

        anomaly_id = data.get("anomaly_id")
        sensor_type = data.get("sensor_type")
        measurement_value = data.get("measurement_value")
        zone_id = data.get("zone_id")
        severity = data.get("severity", "medium")

        # Build context
        anomaly_data = {
            "id": anomaly_id,
            "sensor_type": sensor_type,
            "severity": severity,
            "timestamp": data.get("timestamp"),
        }

        measurement_data = {
            "measurement_value": measurement_value,
            "measurement_type": data.get("measurement_type", ""),
            "zone_id": zone_id,
        }

        # Try Gemini first
        explanation = get_gemini_explanation(anomaly_data, measurement_data)

        # Fallback to pre-built explanations
        if not explanation:
            fallback_key = (
                sensor_type if sensor_type in FALLBACK_EXPLANATIONS else "default"
            )
            explanation = FALLBACK_EXPLANATIONS[fallback_key].copy()

            # Customize with actual values
            if (
                measurement_value is not None
                and sensor_type == "cold_storage_temperature"
            ):
                explanation["what_happened"] = (
                    f"Cold storage temperature reached {measurement_value}°C, exceeding the safe threshold of 5°C. This indicates potential refrigeration issues requiring immediate attention."
                )

        return jsonify(
            {
                "explanation": explanation,
                "source": "gemini" if VERTEX_AVAILABLE else "fallback",
                "anomaly_id": anomaly_id,
            }
        )

    @app.route("/copilot/explain/<anomaly_id>", methods=["GET"])
    def explain_anomaly_by_id(anomaly_id: str):
        """Fetch anomaly by ID and generate explanation."""
        # Get anomaly from Firestore
        doc = db.collection(anomalies_collection).document(anomaly_id).get()

        if not doc.exists:
            return jsonify({"error": "Anomaly not found"}), 404

        anomaly_data = doc.to_dict()
        anomaly_data["id"] = doc.id

        # Get associated measurement
        measurement_id = anomaly_data.get("measurement_id")
        measurement_data = {}

        if measurement_id:
            m_doc = (
                db.collection(measurements_collection).document(measurement_id).get()
            )
            if m_doc.exists:
                measurement_data = m_doc.to_dict()

        # Generate explanation
        explanation = get_gemini_explanation(anomaly_data, measurement_data)

        if not explanation:
            sensor_type = anomaly_data.get("sensor_type", "default")
            fallback_key = (
                sensor_type if sensor_type in FALLBACK_EXPLANATIONS else "default"
            )
            explanation = FALLBACK_EXPLANATIONS[fallback_key]

        return jsonify(
            {
                "explanation": explanation,
                "source": "gemini" if VERTEX_AVAILABLE else "fallback",
                "anomaly": anomaly_data,
                "measurement": measurement_data,
            }
        )
