import frappe

from pitweb.webshop import build_item_group_tree, get_published_item_groups


@frappe.whitelist(allow_guest=True)
def get_webshop_navigation():
    groups = get_published_item_groups()
    by_slug = {row["slug"]: row["name"] for row in groups}

    return {
        "groups": groups,
        "tree": build_item_group_tree(),
        "slug_to_group": by_slug,
    }


@frappe.whitelist(allow_guest=True)
def get_arabic_content_for_routes(routes=None):
    routes = frappe.parse_json(routes) if routes else []
    if isinstance(routes, str):
        routes = [routes]

    routes = [route for route in routes if route]
    if not routes:
        return {}

    has_ar_name = frappe.db.has_column("Item", "custom_arabic_name")
    has_ar_desc = frappe.db.has_column("Item", "custom_arabic_description")

    ar_name_expr = "i.custom_arabic_name" if has_ar_name else "NULL"
    ar_desc_expr = "i.custom_arabic_description" if has_ar_desc else "NULL"

    rows = frappe.db.sql(
        f"""
        SELECT
            wi.route,
            i.item_name,
            i.description,
            {ar_name_expr} AS custom_arabic_name,
            {ar_desc_expr} AS custom_arabic_description
        FROM `tabWebsite Item` wi
        INNER JOIN `tabItem` i ON i.name = wi.item_code
        WHERE wi.route IN %(routes)s
        """,
        {"routes": tuple(routes)},
        as_dict=True,
    )

    out = {}
    for row in rows:
        out[row.route] = {
            "name": row.custom_arabic_name or row.item_name,
            "description": row.custom_arabic_description or row.description,
        }

    return out
