import frappe

from pitweb.webshop import build_item_group_tree, get_published_item_groups


@frappe.whitelist(allow_guest=True)
def health_check():
    # Smoke-check endpoint used to verify API/module import health after deploy.
    return {"ok": True, "app": "pitweb", "module": "pitweb.api"}


@frappe.whitelist(allow_guest=True)
def get_webshop_theme_settings():
    settings = None
    try:
        settings = frappe.get_single("PIT Webshop Settings")
    except Exception:
        # Keep storefront usable even if DocType sync is temporarily broken.
        settings = None

    return {
        "primary_color": (settings.primary_color if settings else None) or "#d71920",
        "dark_text_color": (settings.dark_text_color if settings else None) or "#1f1f1f",
        "light_background_color": (settings.light_background_color if settings else None) or "#f7f7f7",
        "card_background_color": (settings.card_background_color if settings else None) or "#ffffff",
        "border_color": (settings.border_color if settings else None) or "#e5e5e5",
        "base_font_family": (settings.base_font_family if settings else None) or "Poppins, sans-serif",
        "arabic_font_family": (settings.arabic_font_family if settings else None) or "Cairo, sans-serif",
        "base_font_url": settings.base_font_url if settings else None,
        "arabic_font_url": settings.arabic_font_url if settings else None,
        "facebook_url": (settings.facebook_url if settings else None) or "https://facebook.com",
        "youtube_url": (settings.youtube_url if settings else None) or "https://youtube.com",
        "tiktok_url": (settings.tiktok_url if settings else None) or "https://tiktok.com",
    }


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
