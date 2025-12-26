import os
from typing import Optional

try:
    from google.cloud import aiplatform
except Exception:
    aiplatform = None


def predict_anomaly_with_vertex(
    current_value: float,
    sensor_id: str,
    sensor_type: str,
    history_mean: float,
    history_std: float,
    project: str,
    region: str,
    endpoint_id: str,
) -> Optional[str]:
    """
    Call Vertex AI endpoint for anomaly scoring.
    Expects the deployed model to return a label in {'positive','negative','none'}.
    """
    if aiplatform is None:
        return None

    instance = {
        "sensor_id": sensor_id,
        "sensor_type": sensor_type,
        "current_value": current_value,
        "history_mean": history_mean,
        "history_std": history_std,
    }

    endpoint_path = f"projects/{project}/locations/{region}/endpoints/{endpoint_id}"
    client = aiplatform.gapic.PredictionServiceClient(
        client_options={"api_endpoint": f"{region}-aiplatform.googleapis.com"}
    )

    try:
        response = client.predict(
            endpoint=endpoint_path,
            instances=[instance],
            parameters={},
        )
        if response and response.predictions:
            # Expect a simple {"anomaly": "positive|negative|none"} per prediction
            pred = response.predictions[0]
            if isinstance(pred, dict) and "anomaly" in pred:
                return str(pred["anomaly"])
            # Fallback: try first element if a list/struct is returned
            if isinstance(pred, (list, tuple)) and len(pred) > 0:
                return str(pred[0])
    except Exception as exc:
        print("Vertex AI predict failed, falling back to local detection:", exc)
    return None


def predict_anomaly(
    current_value: float,
    sensor_id: str,
    sensor_type: str,
    history_mean: float,
    history_std: float,
) -> Optional[str]:
    """Wrapper that reads env vars and calls Vertex if configured, else None."""
    endpoint_id = os.getenv("VERTEX_ENDPOINT_ID")
    project = os.getenv("VERTEX_PROJECT")
    region = os.getenv("VERTEX_REGION", "us-central1")
    if not endpoint_id or not project:
        return None
    return predict_anomaly_with_vertex(
        current_value,
        sensor_id,
        sensor_type,
        history_mean,
        history_std,
        project,
        region,
        endpoint_id,
    )
