import re

import frappe
from frappe.utils import cint, cstr

ROOT_GROUP_CANDIDATES = ("ALL PRODUCTS", "All Products")


def _get_root_item_group_name():
    for candidate in ROOT_GROUP_CANDIDATES:
        if frappe.db.exists("Item Group", candidate):
            return candidate

    return frappe.db.get_value(
        "Item Group",
        {"is_group": 1, "parent_item_group": ["in", ["", None]]},
        "name",
    )


def _is_published_group(doc):
    # ERPNext commonly uses show_in_website for category visibility.
    return cint(doc.get("show_in_website", 0)) == 1


def _build_slug(name):
    value = cstr(name or "").strip().lower()
    # Keep URL slugs stable while preserving unicode letters (for Arabic category names).
    value = re.sub(r"[^\w]+", "-", value, flags=re.UNICODE)
    value = re.sub(r"[_-]+", "-", value).strip("-")
    return value


def get_published_item_groups(root_group=None):
    root_group = root_group or _get_root_item_group_name()
    if not root_group:
        return []

    groups = frappe.get_all(
        "Item Group",
        fields=[
            "name",
            "item_group_name",
            "parent_item_group",
            "show_in_website",
            "is_group",
        ],
        order_by="lft asc",
    )

    by_name = {row.name: row for row in groups}
    out = []

    for row in groups:
        if row.name == root_group:
            continue

        current = row.name
        is_under_root = False
        while current and current in by_name:
            parent = by_name[current].parent_item_group
            if parent == root_group:
                is_under_root = True
                break
            current = parent

        if not is_under_root:
            continue

        if not _is_published_group(row):
            continue

        out.append(
            {
                "name": row.name,
                "label": row.item_group_name or row.name,
                "parent": row.parent_item_group,
                "slug": _build_slug(row.name),
            }
        )

    return out


def build_item_group_tree(root_group=None):
    items = get_published_item_groups(root_group=root_group)
    by_parent = {}
    by_name = {}

    for item in items:
        by_name[item["name"]] = {**item, "children": []}
        by_parent.setdefault(item["parent"], []).append(item["name"])

    roots = []
    for item in items:
        node = by_name[item["name"]]
        parent = item["parent"]

        if parent in by_name:
            by_name[parent]["children"].append(node)
        else:
            roots.append(node)

    return roots


def get_group_descendants(parent_group):
    parent_group = cstr(parent_group or "").strip()
    if not parent_group:
        return []

    groups = frappe.get_all(
        "Item Group",
        fields=["name", "parent_item_group"],
        order_by="lft asc",
    )

    by_parent = {}
    for row in groups:
        by_parent.setdefault(row.parent_item_group, []).append(row.name)

    out = []
    queue = [parent_group]
    seen = set()

    while queue:
        current = queue.pop(0)
        if current in seen:
            continue

        seen.add(current)
        out.append(current)
        for child in by_parent.get(current, []):
            if child not in seen:
                queue.append(child)

    return out


def _set_public_file(file_url):
    if not file_url:
        return

    if not file_url.startswith("/private/files/"):
        return

    file_name = file_url.rsplit("/", 1)[-1]
    file_doc = frappe.db.get_value("File", {"file_name": file_name}, "name")
    if not file_doc:
        return

    frappe.db.set_value("File", file_doc, "is_private", 0)


def on_website_item_validate(doc, method=None):
    item_code = doc.get("item_code")
    if not item_code:
        return

    item = frappe.db.get_value(
        "Item",
        item_code,
        ["name", "item_name", "item_group", "show_in_website", "disabled", "image"],
        as_dict=True,
    )
    if not item:
        return

    should_publish = cint(item.show_in_website) == 1 and cint(item.disabled) == 0
    if hasattr(doc, "published"):
        doc.published = should_publish

    group_slug = _build_slug(item.item_group)
    item_slug = _build_slug(item.item_name or item.name)
    if group_slug and item_slug:
        doc.route = f"products/{group_slug}/{item_slug}"

    _set_public_file(item.image)


def on_item_update(doc, method=None):
    should_publish = cint(doc.get("show_in_website")) == 1 and cint(doc.get("disabled")) == 0
    group_slug = _build_slug(doc.get("item_group"))
    item_slug = _build_slug(doc.get("item_name") or doc.get("name"))
    route = f"products/{group_slug}/{item_slug}" if group_slug and item_slug else None

    website_items = frappe.get_all(
        "Website Item",
        filters={"item_code": doc.name},
        fields=["name"],
        limit=20,
    )

    for row in website_items:
        values = {"published": should_publish}
        if route:
            values["route"] = route
        frappe.db.set_value("Website Item", row.name, values, update_modified=False)

    _set_public_file(doc.get("image"))
