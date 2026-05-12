from frappe import _


def get_data():
    return [
        {
            "label": _("Website Customization"),
            "items": [
                {
                    "type": "doctype",
                    "name": "PIT Webshop Settings",
                    "label": _("PIT Webshop Settings"),
                    "description": _("Manage website colors, fonts, and social links"),
                }
            ],
        }
    ]
