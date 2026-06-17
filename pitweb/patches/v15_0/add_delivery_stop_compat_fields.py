import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    # Delivery Trip validate_stop_addresses in ERPNext v15 expects these fields.
    custom_fields = {
        "Delivery Stop": [
            {
                "fieldname": "address",
                "label": "Address",
                "fieldtype": "Link",
                "options": "Address",
                "insert_after": "customer",
                "read_only": 1,
                "hidden": 1,
                "no_copy": 1,
            },
            {
                "fieldname": "customer_address",
                "label": "Customer Address",
                "fieldtype": "Small Text",
                "insert_after": "address",
                "read_only": 1,
                "hidden": 1,
                "no_copy": 1,
            },
        ]
    }

    create_custom_fields(custom_fields, update=True)
