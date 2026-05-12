import frappe


def execute():
    if not frappe.db.exists("DocType", "PIT Webshop Settings"):
        return

    # Repair broken module mapping so Frappe imports controller from pitweb app.
    frappe.db.set_value("DocType", "PIT Webshop Settings", "module", "Pitweb", update_modified=False)
    frappe.db.commit()
