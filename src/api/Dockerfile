FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/api ./src/api

EXPOSE 8080
ENV PYTHONPATH=/app
CMD ["python", "-m", "src.api.app"]
