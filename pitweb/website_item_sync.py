import frappe


def _item_has_website_image_column():
    return frappe.db.has_column("Item", "website_image")


def _get_item_image(item_doc):
    # Prefer explicit website image when available, otherwise fallback to item image.
    return (item_doc.get("website_image") or item_doc.get("image") or "").strip()


def apply_item_image_to_website_item(doc, method=None):
    if not doc.get("item_code"):
        return

    fields = ["image"]
    if _item_has_website_image_column():
        fields.append("website_image")

    item_doc = frappe.db.get_value(
        "Item",
        doc.item_code,
        fields,
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


def sync_all_website_item_images():
    """Backfill Website Item.website_image from linked Item image fields."""
    item_image_expression = "COALESCE(NULLIF(i.image, ''), '')"
    if _item_has_website_image_column():
        item_image_expression = "COALESCE(NULLIF(i.website_image, ''), NULLIF(i.image, ''), '')"

    frappe.db.sql(
        f"""
        UPDATE `tabWebsite Item` wi
        INNER JOIN `tabItem` i ON i.name = wi.item_code
        SET wi.website_image = {item_image_expression}
        WHERE IFNULL(wi.website_image, '') != {item_image_expression}
        """
    )
