def test_firestore_payload():
    payload = {"price": 3.99}
    assert isinstance(payload["price"], float)
