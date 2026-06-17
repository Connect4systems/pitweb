import frappe
from frappe.contacts.doctype.address.address import get_address_display


def _get_delivery_note_address(delivery_note):
    if not delivery_note:
        return ""

    row = frappe.db.get_value(
        "Delivery Note",
        delivery_note,
        ["customer_address", "shipping_address_name"],
        as_dict=True,
    )
    if not row:
        return ""

    return row.customer_address or row.shipping_address_name or ""


def ensure_delivery_stop_customer_address(doc, method=None):
    """Backfill Delivery Stop.address/customer_address for ERPNext v15 validate_stop_addresses."""
    for stop in doc.get("delivery_stops") or []:
        address = getattr(stop, "address", None) or ""
        customer_address_display = getattr(stop, "customer_address", None) or ""

        if not address:
            address = _get_delivery_note_address(getattr(stop, "delivery_note", None))

        if not customer_address_display and address:
            try:
                customer_address_display = get_address_display(
                    frappe.get_doc("Address", address).as_dict()
                )
            except Exception:
                customer_address_display = ""

        if not customer_address_display:
            customer_address_display = "Address not set"

        stop.address = address
        stop.customer_address = customer_address_display
