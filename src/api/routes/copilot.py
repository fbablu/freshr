import os
import json
from flask import jsonify, request

# Initialize Vertex AI availability
VERTEX_AVAILABLE = False
VERTEX_INIT_ERROR = None

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel

    VERTEX_AVAILABLE = True
except ImportError as e:
    VERTEX_INIT_ERROR = f"vertexai import failed: {e}"
    print(f"[COPILOT] {VERTEX_INIT_ERROR}")


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


def get_gemini_explanation(
    anomaly_data: dict, measurement_data: dict
) -> tuple[dict | None, str | None]:
    """
    Call Gemini to generate contextual explanation.
    Returns (explanation_dict, error_string) - one will be None.
    """
    if not VERTEX_AVAILABLE:
        return None, f"Vertex SDK not available: {VERTEX_INIT_ERROR}"

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "rich-archery-482201-b6")
    location = os.getenv("VERTEX_REGION", "us-central1")

    print(f"[COPILOT] Calling Gemini - project={project_id}, location={location}")

    text = ""
    try:
        vertexai.init(project=project_id, location=location)
        model = GenerativeModel("gemini-2.5-pro")  # Fast model for real-time use

        # Build a detailed prompt
        sensor_type = anomaly_data.get("sensor_type", "unknown")
        severity = anomaly_data.get("severity", "medium")
        zone_id = measurement_data.get("zone_id", "unknown")
        value = measurement_data.get("measurement_value", "N/A")
        unit = measurement_data.get("measurement_type", "")
        timestamp = anomaly_data.get("timestamp", "unknown")

        prompt = f"""You are a food safety expert AI assistant for commercial kitchens.
Analyze this anomaly and provide actionable guidance for kitchen staff.

ANOMALY DETAILS:
- Sensor Type: {sensor_type}
- Severity: {severity}
- Kitchen Zone: {zone_id}
- Current Reading: {value} {unit}
- Detection Time: {timestamp}

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{{
    "what_happened": "Clear 1-2 sentence explanation of what the sensor detected and why it's abnormal",
    "why_it_matters": "Food safety implications - mention specific pathogens, FDA guidelines, or HACCP requirements",
    "what_to_do": ["Immediate action 1", "Action 2", "Action 3", "Action 4"],
    "confirm_recovery": "Specific criteria to verify the issue is resolved"
}}

Be specific and practical. Reference actual food safety standards."""

        print(
            f"[COPILOT] Sending prompt to Gemini (sensor={sensor_type}, zone={zone_id})..."
        )
        response = model.generate_content(prompt)

        if not response:
            print("[COPILOT] ERROR: Gemini returned no response object")
            return None, "Gemini returned no response object"

        if not response.text:
            # Check for blocked content
            if hasattr(response, "prompt_feedback"):
                print(f"[COPILOT] ERROR: Gemini blocked - {response.prompt_feedback}")
                return None, f"Gemini blocked: {response.prompt_feedback}"
            print("[COPILOT] ERROR: Gemini returned empty text")
            return None, "Gemini returned empty text"

        text = response.text.strip()
        print(f"[COPILOT] Gemini raw response ({len(text)} chars): {text[:200]}...")

        # Handle markdown code blocks if present
        if text.startswith("```"):
            parts = text.split("```")
            if len(parts) >= 2:
                text = parts[1]
                if text.lower().startswith("json"):
                    text = text[4:].strip()
                text = text.strip()

        result = json.loads(text)
        print(f"[COPILOT] SUCCESS: Parsed Gemini response")
        return result, None

    except json.JSONDecodeError as e:
        print(f"[COPILOT] ERROR: JSON parse failed - {e}")
        return None, f"JSON parse error: {e}. Raw: {text[:200]}"
    except Exception as e:
        print(f"[COPILOT] ERROR: {type(e).__name__}: {e}")
        return None, f"{type(e).__name__}: {e}"


def register(app, db, anomalies_collection: str, measurements_collection: str):
    """Register copilot routes."""

    @app.route("/copilot/status", methods=["GET"])
    def copilot_status():
        """Check copilot/Gemini availability."""
        return jsonify(
            {
                "vertex_available": VERTEX_AVAILABLE,
                "init_error": VERTEX_INIT_ERROR,
                "project": os.getenv("GOOGLE_CLOUD_PROJECT", "not set"),
                "region": os.getenv("VERTEX_REGION", "not set"),
            }
        )

    @app.route("/copilot/explain", methods=["POST"])
    def explain_anomaly():
        """Generate AI explanation for an anomaly. Always tries Gemini first."""
        data = request.get_json() or {}
        use_fallback = data.get("use_fallback", False)  # Explicit opt-in to fallback

        anomaly_id = data.get("anomaly_id")
        sensor_type = data.get("sensor_type")
        measurement_value = data.get("measurement_value")
        zone_id = data.get("zone_id")
        severity = data.get("severity", "medium")

        print(
            f"[COPILOT] /explain called - anomaly={anomaly_id}, sensor={sensor_type}, use_fallback={use_fallback}"
        )

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

        # Try Gemini
        explanation, error = get_gemini_explanation(anomaly_data, measurement_data)

        if explanation:
            print(f"[COPILOT] Returning Gemini response for {anomaly_id}")
            return jsonify(
                {
                    "explanation": explanation,
                    "source": "gemini",
                    "anomaly_id": anomaly_id,
                }
            )

        print(f"[COPILOT] Gemini failed: {error}")

        # Gemini failed - return error or fallback
        if use_fallback:
            print(f"[COPILOT] Using fallback for {anomaly_id}")
            fallback_key = (
                sensor_type if sensor_type in FALLBACK_EXPLANATIONS else "default"
            )
            fallback = FALLBACK_EXPLANATIONS[fallback_key].copy()
            if (
                measurement_value is not None
                and sensor_type == "cold_storage_temperature"
            ):
                fallback["what_happened"] = (
                    f"Cold storage temperature reached {measurement_value}°C, "
                    f"exceeding the safe threshold of 5°C."
                )
            return jsonify(
                {
                    "explanation": fallback,
                    "source": "fallback",
                    "gemini_error": error,
                    "anomaly_id": anomaly_id,
                }
            )

        # No fallback - return error
        print(f"[COPILOT] Returning 500 error for {anomaly_id}")
        return (
            jsonify(
                {
                    "error": "Gemini call failed",
                    "gemini_error": error,
                    "source": "none",
                    "anomaly_id": anomaly_id,
                }
            ),
            500,
        )

    @app.route("/copilot/explain/<anomaly_id>", methods=["GET"])
    def explain_anomaly_by_id(anomaly_id: str):
        """Fetch anomaly by ID and generate explanation."""
        use_fallback = request.args.get("fallback", "false").lower() == "true"

        doc = db.collection(anomalies_collection).document(anomaly_id).get()
        if not doc.exists:
            return jsonify({"error": "Anomaly not found"}), 404

        anomaly_data = doc.to_dict()
        anomaly_data["id"] = doc.id

        measurement_id = anomaly_data.get("measurement_id")
        measurement_data = {}
        if measurement_id:
            m_doc = (
                db.collection(measurements_collection).document(measurement_id).get()
            )
            if m_doc.exists:
                measurement_data = m_doc.to_dict()

        explanation, error = get_gemini_explanation(anomaly_data, measurement_data)

        if explanation:
            return jsonify(
                {
                    "explanation": explanation,
                    "source": "gemini",
                    "anomaly": anomaly_data,
                    "measurement": measurement_data,
                }
            )

        if use_fallback:
            sensor_type = anomaly_data.get("sensor_type", "default")
            fallback_key = (
                sensor_type if sensor_type in FALLBACK_EXPLANATIONS else "default"
            )
            return jsonify(
                {
                    "explanation": FALLBACK_EXPLANATIONS[fallback_key],
                    "source": "fallback",
                    "gemini_error": error,
                    "anomaly": anomaly_data,
                    "measurement": measurement_data,
                }
            )

        return (
            jsonify(
                {
                    "error": "Gemini call failed",
                    "gemini_error": error,
                    "anomaly": anomaly_data,
                    "measurement": measurement_data,
                }
            ),
            500,
        )

    @app.route("/copilot/test", methods=["GET"])
    def test_gemini():
        """Test endpoint to verify Gemini is working."""
        test_anomaly = {
            "sensor_type": "cold_storage_temperature",
            "severity": "high",
            "timestamp": "2025-01-01T12:00:00Z",
        }
        test_measurement = {
            "measurement_value": 8.5,
            "measurement_type": "°C",
            "zone_id": "cold_storage",
        }

        explanation, error = get_gemini_explanation(test_anomaly, test_measurement)

        return jsonify(
            {
                "vertex_available": VERTEX_AVAILABLE,
                "init_error": VERTEX_INIT_ERROR,
                "test_result": "success" if explanation else "failed",
                "gemini_error": error,
                "explanation": explanation,
            }
        )
