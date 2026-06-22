import frappe


def _get_item_image(item_doc):
    # Prefer explicit website image when available, otherwise fallback to item image.
    return (item_doc.get("website_image") or item_doc.get("image") or "").strip()


def apply_item_image_to_website_item(doc, method=None):
    if not doc.get("item_code"):
        return

    item_doc = frappe.db.get_value(
        "Item",
        doc.item_code,
        ["image", "website_image"],
        as_dict=True,
    )

    if not item_doc:
        return

    doc.website_image = _get_item_image(item_doc)


def sync_website_item_image_from_item(doc, method=None):
    item_image = _get_item_image(doc)

    frappe.db.sql(
        """
        UPDATE `tabWebsite Item`
        SET website_image = %(item_image)s
        WHERE item_code = %(item_code)s
          AND IFNULL(website_image, '') != %(item_image)s
        """,
        {
            "item_code": doc.name,
            "item_image": item_image,
        },
    )
