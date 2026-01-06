# Freshr

**Real-time food safety monitoring powered by AI on data in motion.**

Freshr detects contamination risks in commercial kitchens *before* food reaches guests—using streaming sensor data on Confluent and AI-assisted anomaly detection on Google Cloud.

🔗 **Live Demo:** [freshr.web.app](https://freshr.web.app/map)


<p align="center">
  <a href="https://www.confluent.io/" target="_blank"><img src="https://img.shields.io/badge/Confluent-000000?style=for-the-badge&logo=apache-kafka&logoColor=white" alt="Confluent"></a>
  <a href="https://cloud.google.com/vertex-ai" target="_blank"><img src="https://img.shields.io/badge/Vertex_AI-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Vertex AI"></a>
  <a href="https://firebase.google.com/" target="_blank"><img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"></a>
  <a href="https://angular.io/" target="_blank"><img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular"></a>
  <a href="https://www.python.org/" target="_blank"><img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://flask.palletsprojects.com/" target="_blank"><img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"></a>
</p>


---

## Problem

Foodborne illness outbreaks are detected too late. The October 2024 McDonald's E. coli outbreak sickened 100+ people across 14 states before the source was identified. Traditional monitoring relies on periodic inspections and reactive testing.

## Solution

Freshr applies AI to real-time kitchen telemetry to catch risks as they emerge:

- **Temperature drift** in cold storage before spoilage occurs
- **Hygiene compliance gaps** (handwash, sanitization) during busy periods  
- **Cross-contamination risks** across zones and batches

When anomalies are detected, Freshr generates actionable incidents with AI-powered explanations and recommended actions (hold, discard, sanitize, retrain).

---

## Architecture

```
Kitchen Sensors → Kafka (Confluent Cloud) → Processor → Firestore → API → Angular UI
                                              ↓
                                    Gemini (Vertex AI)
                                    Anomaly Explanations
```

**Confluent Cloud** streams sensor events across dedicated topics (`sensor-physical-*`, `sensor-operational-*`) with a processing pipeline that detects anomalies in real-time.

**Google Cloud** powers the backend (Cloud Run), data persistence (Firestore), and AI reasoning (Vertex AI / Gemini) for contextual explanations and recommendations.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Streaming | Kafka / Confluent Cloud |
| Backend | Python Flask on Cloud Run |
| Database | Google Firestore |
| AI | Vertex AI / Gemini |
| Frontend | Angular 18 + Tailwind |
| Hosting | Firebase Hosting |

---

## Demo Scenarios

The live demo includes simulations based on real outbreak patterns:

- **McDonald's E. coli (Oct 2024)** — Multi-zone contamination cascade
- **Temperature Drift** — Refrigeration failure simulation
- **Hygiene Failure** — Compliance drops during rush periods
- **Recovery Mode** — System returning to healthy baseline

---

## Local Development

```bash
# Frontend
pnpm install
ng serve

# Backend (requires Kafka credentials)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

---

## Deployment

```bash
# Build and deploy to Google Cloud
./scripts/build_cloud.sh --api-only
source .env
./scripts/deploy_cloud_run.sh --api-only

# Frontend
firebase deploy
```

---

## License

MIT
