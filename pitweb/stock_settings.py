import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def ensure_stock_settings():
    """Create missing stock controls without overwriting site customizations."""
    fields = [
        {
            "fieldname": "custom_website_stock_warehouse",
            "label": "Website Stock Warehouse",
            "fieldtype": "Link",
            "options": "Warehouse",
            "depends_on": "eval:!doc.custom_all_companies_warehouses",
        },
        {
            "fieldname": "custom_all_companies_warehouses",
            "label": "Show All Company Stock",
            "fieldtype": "Check",
            "insert_after": "custom_website_stock_warehouse",
            "default": "0",
            "description": "Use combined stock from every warehouse in every company.",
        },
        {
            "fieldname": "custom_show_only_available_stock_products",
            "label": "Show Only Available Stock Products",
            "fieldtype": "Check",
            "insert_after": "custom_all_companies_warehouses",
            "default": "0",
        },
    ]
    meta = frappe.get_meta("Website Settings")
    missing = [field for field in fields if not meta.has_field(field["fieldname"])]
    if missing:
        create_custom_fields({"Website Settings": missing}, update=False)
