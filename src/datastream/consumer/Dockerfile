FROM python:3.11-slim

WORKDIR /app

# Install dependencies from repo root
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy consumer app
COPY src/datastream/consumer/app.py .
COPY src/datastream/schemas/price_events.json ./price_events.json

# Expected runtime configuration
# ENV KAFKA_BOOTSTRAP=broker:9092
# ENV KAFKA_SECURITY_PROTOCOL=PLAINTEXT

CMD ["python", "app.py"]
