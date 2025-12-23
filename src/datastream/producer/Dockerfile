FROM python:3.11-slim

WORKDIR /app

# Install dependencies from repo root
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy producer app
COPY src/datastream/producer/app.py .
COPY src/datastream/schemas/price_events.json ./price_events.json

# Default values; override at runtime
ENV STORE_ID=store_1
# ENV KAFKA_BOOTSTRAP=broker:9092
# ENV KAFKA_SECURITY_PROTOCOL=PLAINTEXT

CMD ["python", "app.py"]
