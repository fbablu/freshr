# dynamap
Project for AI Partner for Catalyst

## TODO (remove afterwards)
- Switch from local Kafka to Confluent Cloud for productionizattion
```bash
Producer({
  "bootstrap.servers": "kafka:9092"
})
```
- Deploy all components to production + stream line this so that it is seamless
```bash
Producer({
  "bootstrap.servers": "<cluster>.confluent.cloud:9092",
  "security.protocol": "SASL_SSL",
  "sasl.mechanism": "PLAIN",
  "sasl.username": "<API_KEY>",
  "sasl.password": "<API_SECRET>"
})
```

## Setup (virtual environment)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # dev tools (linter, format)
pip install -r requirements.txt
```

## Running tests
```bash
pytest
```

## Linting
```bash
ruff check .
```

## Formatting
```bash
black .
```
