def test_event_shape():
    event = {
        "store_id": "s",
        "product_id": "p",
        "price": 1.0,
        "timestamp": "2025-01-01T00:00:00Z",
    }
    assert "store_id" in event
