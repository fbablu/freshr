#!/usr/bin/env bash
set -euo pipefail

# Build and push all images to Artifact Registry via Cloud Build.
# Requires: Artifact Registry repo "dynamap" in project "rich-archery-482201-b6" (region us-central1),
# and `gcloud auth configure-docker us-central1-docker.pkg.dev`.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="rich-archery-482201-b6"

gcloud builds submit . --project "$PROJECT" --config src/datastream/producer/config/cloudbuild.yaml
gcloud builds submit . --project "$PROJECT" --config src/datastream/consumer/config/cloudbuild.yaml
gcloud builds submit . --project "$PROJECT" --config src/datastream/processing/config/cloudbuild.yaml
gcloud builds submit . --project "$PROJECT" --config src/api/config/cloudbuild.yaml
