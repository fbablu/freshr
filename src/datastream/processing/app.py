from flask import Flask
from flask import jsonify
from google.cloud import firestore

app = Flask(__name__)
db = firestore.Client()


@app.route("/process/store/<store_id>")
def process_store(store_id):
    docs = db.collection("prices").where("store_id", "==", store_id).stream()
    prices = [d.to_dict()["price"] for d in docs]

    return jsonify(
        {
            "store_id": store_id,
            "avg_price": sum(prices) / len(prices) if prices else None,
        }
    )
