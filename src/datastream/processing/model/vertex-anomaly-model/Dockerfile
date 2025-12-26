FROM python:3.11-slim

WORKDIR /app
COPY predictor.py .

RUN pip install --no-cache-dir google-cloud-aiplatform

ENV PORT=8080

CMD ["python", "-m", "google.cloud.aiplatform.prediction.model_server"]