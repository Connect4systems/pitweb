def ensure_delivery_stop_customer_address(doc, method=None):
    """Backfill missing Delivery Stop.customer_address to avoid v15 validate crash."""
    for stop in doc.get("delivery_stops") or []:
        current_value = getattr(stop, "customer_address", None)
        if current_value:
            continue

        fallback = ""
        for fieldname in ("address", "customer_primary_address", "delivery_address"):
            value = getattr(stop, fieldname, None)
            if value:
                fallback = value
                break

        stop.customer_address = fallback
