import os

from flask import Flask
from flask_cors import CORS
from google.cloud import firestore

from src.api.routes import anomalies, devices, measurements

DEVICE_COLLECTION = os.getenv("DEVICE_COLLECTION", "device_measurements")
ANOMALIES_COLLECTION = os.getenv("ANOMALIES_COLLECTION", "anomalies")


def create_app():
    app = Flask(__name__)

    # Enable CORS for localhost and production
    CORS(
        app,
        origins=[
            "http://localhost:4200",
            "http://localhost:4201",
            "https://freshr-482201-b6.web.app",
            "https://freshr-482201-b6.firebaseapp.com",
        ],
    )

    db = firestore.Client()

    measurements.register(app, db, DEVICE_COLLECTION)
    anomalies.register(app, db, ANOMALIES_COLLECTION, DEVICE_COLLECTION, firestore)
    devices.register(app, db, DEVICE_COLLECTION)
    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
