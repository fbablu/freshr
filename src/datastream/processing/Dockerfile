FROM python:3.11-slim

WORKDIR /app

# Install dependencies from repo root
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy processing app and config
COPY src/datastream/processing/app.py .
COPY src/datastream/processing/tracked_products.json ./tracked_products.json
COPY src/datastream/schemas/scores.json ./scores.json

# Expected runtime configuration (FireStore credentials via env/ADC)
CMD ["python", "app.py"]
