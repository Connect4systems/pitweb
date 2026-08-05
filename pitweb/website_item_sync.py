import frappe


ITEM_IMAGE_FIELDS = ("website_image", "image")


def _item_has_website_image_column():
    return frappe.db.has_column("Item", "website_image")


def _get_item_image(item_doc):
    # Prefer explicit website image when available, otherwise fallback to item image.
    return (item_doc.get("website_image") or item_doc.get("image") or "").strip()


def _make_file_public(file_url):
    """Move a private Frappe file to public storage and return its new URL."""
    file_url = (file_url or "").strip()
    if not file_url.startswith("/private/files/"):
        return file_url

    file_name = frappe.db.get_value(
        "File",
        {"file_url": file_url, "is_private": 1},
        "name",
    )
    if not file_name:
        return file_url

    file_doc = frappe.get_doc("File", file_name)
    file_doc.is_private = 0
    # File.save() invokes Frappe's privacy-change handler. It moves the file on
    # disk and updates references from /private/files/ to /files/ atomically.
    file_doc.save(ignore_permissions=True)
    return file_doc.file_url


def ensure_item_images_are_public(doc, method=None):
    """Ensure Item image fields never retain a private file URL."""
    changed = {}
    for fieldname in ITEM_IMAGE_FIELDS:
        if fieldname == "website_image" and not _item_has_website_image_column():
            continue

        image_url = doc.get(fieldname)
        if image_url:
            public_url = _make_file_public(image_url)
            if public_url != image_url:
                setter = getattr(doc, "set", None)
                if callable(setter):
                    setter(fieldname, public_url)
                else:
                    doc[fieldname] = public_url
                changed[fieldname] = public_url

    return changed


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

    changed = ensure_item_images_are_public(item_doc)
    if changed:
        frappe.db.set_value("Item", doc.item_code, changed, update_modified=False)
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


def make_all_item_images_public():
    """Convert existing private Item image files and refresh Website Items."""
    fields = ["name", "image"]
    if _item_has_website_image_column():
        fields.append("website_image")

    items = frappe.get_all("Item", fields=fields, limit_page_length=0)
    for item in items:
        changed = ensure_item_images_are_public(item)
        if changed:
            frappe.db.set_value("Item", item.name, changed, update_modified=False)

    sync_all_website_item_images()
