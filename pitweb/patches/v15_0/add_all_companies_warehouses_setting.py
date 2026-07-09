import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    create_custom_fields(
        {
            "Website Settings": [
                {
                    "fieldname": "custom_all_companies_warehouses",
                    "label": "All Companies Warehouses",
                    "fieldtype": "Check",
                    "insert_after": "custom_website_stock_warehouse",
                    "default": "0",
                    "description": (
                        "Use the combined stock from every warehouse in every company."
                    ),
                }
            ]
        },
        update=True,
    )

    warehouse_field = frappe.db.get_value(
        "Custom Field",
        {
            "dt": "Website Settings",
            "fieldname": "custom_website_stock_warehouse",
        },
        "name",
    )
    if warehouse_field:
        frappe.db.set_value(
            "Custom Field",
            warehouse_field,
            "depends_on",
            "eval:!doc.custom_all_companies_warehouses",
        )
