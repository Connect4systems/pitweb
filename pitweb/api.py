import frappe
from frappe.utils import flt, cint


def _normalize_rfq_redirect(payload):
    if isinstance(payload, str):
        if payload.startswith("/quotations/"):
            return "/"
        return payload

    if not isinstance(payload, dict):
        return payload

    normalized = dict(payload)
    redirect_keys = ["redirect_to", "redirect_url", "route", "url"]

    for key in redirect_keys:
        value = normalized.get(key)
        if isinstance(value, str) and value.startswith("/quotations/"):
            normalized[key] = "/"

    # Ensure frontend always has a safe destination if upstream only returned a quotation route.
    if not any(normalized.get(k) for k in redirect_keys):
        normalized["redirect_to"] = "/"

    return normalized


@frappe.whitelist(allow_guest=True)
def request_for_quotation(*args, **kwargs):
    from webshop.webshop.shopping_cart import cart as webshop_cart

    passthrough_kwargs = dict(kwargs or {})
    passthrough_kwargs.pop("cmd", None)

    try:
        response = webshop_cart.request_for_quotation(*args, **passthrough_kwargs)
    except TypeError:
        # Upstream signature differs between versions; fallback to no-arg call.
        response = webshop_cart.request_for_quotation()

    return _normalize_rfq_redirect(response)


def get_website_stock_settings():
    website_warehouse = frappe.db.get_single_value(
        "Website Settings",
        "custom_website_stock_warehouse"
    )

    show_only_available = cint(
        frappe.db.get_single_value(
            "Website Settings",
            "custom_show_only_available_stock_products"
        )
    )

    return website_warehouse, show_only_available


def get_item_stock_qty(item_code, warehouse=None):
    if warehouse:
        return flt(
            frappe.db.get_value(
                "Bin",
                {
                    "item_code": item_code,
                    "warehouse": warehouse
                },
                "actual_qty"
            )
        )

    qty = frappe.db.sql(
        """
        SELECT COALESCE(SUM(actual_qty), 0)
        FROM `tabBin`
        WHERE item_code = %s
        """,
        item_code
    )

    return flt(qty[0][0]) if qty else 0


def get_item_price(item_code):
    rate = frappe.db.sql(
        """
        SELECT price_list_rate
        FROM `tabItem Price`
        WHERE
            item_code = %s
            AND selling = 1
            AND IFNULL(price_list_rate, 0) > 0
        ORDER BY valid_from DESC, modified DESC
        LIMIT 1
        """,
        item_code
    )

    return flt(rate[0][0]) if rate else 0


def _normalize_routes(routes):
    normalized_routes = []

    for route in routes or []:
        if not route:
            continue

        clean_route = str(route).strip()
        if not clean_route:
            continue

        clean_route = clean_route.split("?", 1)[0].split("#", 1)[0].strip("/")
        if clean_route:
            normalized_routes.append(clean_route)

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(normalized_routes))


@frappe.whitelist(allow_guest=True)
def get_website_items_stock_by_route(routes=None):
    routes = frappe.parse_json(routes) if routes else []
    normalized_routes = _normalize_routes(routes)

    website_warehouse, show_only_available = get_website_stock_settings()

    if not normalized_routes:
        return {
            "website_warehouse": website_warehouse,
            "show_only_available": cint(show_only_available),
            "items": {},
        }

    website_items = frappe.get_all(
        "Website Item",
        filters={
            "route": ["in", normalized_routes],
            "published": 1,
        },
        fields=["route", "item_code"],
        limit_page_length=0,
    )

    items_by_route = {}
    for row in website_items:
        actual_qty = get_item_stock_qty(row.item_code, website_warehouse)
        items_by_route[f"/{row.route.strip('/')}"] = {
            "item_code": row.item_code,
            "actual_qty": actual_qty,
            "in_stock": actual_qty > 0,
        }

    return {
        "website_warehouse": website_warehouse,
        "show_only_available": cint(show_only_available),
        "items": items_by_route,
    }


@frappe.whitelist(allow_guest=True)
def get_product_page_info(item_code=None, route=None):
    if not item_code and route:
        route = route.strip("/")
        item_code = frappe.db.get_value(
            "Website Item",
            {"route": route},
            "item_code"
        )

    if not item_code:
        return {}

    website_warehouse, show_only_available = get_website_stock_settings()

    actual_qty = get_item_stock_qty(item_code, website_warehouse)
    price_list_rate = get_item_price(item_code)

    return {
        "item_code": item_code,
        "actual_qty": actual_qty,
        "in_stock": actual_qty > 0,
        "show_only_available": show_only_available,
        "price_list_rate": price_list_rate,
        "price_display": f"{price_list_rate:,.2f} LE" if price_list_rate > 0 else ""
    }


@frappe.whitelist(allow_guest=True)
def get_related_products(item_code=None, route=None, limit=20):
    limit = int(limit or 20)

    if not item_code and route:
        route = route.strip("/")
        item_code = frappe.db.get_value(
            "Website Item",
            {"route": route},
            "item_code"
        )

    if not item_code:
        return []

    item_group = frappe.db.get_value("Item", item_code, "item_group")

    if not item_group:
        return []

    website_warehouse, show_only_available = get_website_stock_settings()

    warehouse_condition = ""
    having_condition = ""

    values = {
        "item_code": item_code,
        "item_group": item_group,
        "limit": limit,
    }

    if website_warehouse:
        warehouse_condition = "AND bin.warehouse = %(website_warehouse)s"
        values["website_warehouse"] = website_warehouse

    if show_only_available:
        having_condition = "HAVING actual_qty > 0"

    products = frappe.db.sql(
        f"""
        SELECT
            wi.item_code,
            wi.web_item_name,
            wi.route,
            wi.website_image,
            i.item_group,
            MAX(ip.price_list_rate) AS price_list_rate,
            COALESCE(SUM(bin.actual_qty), 0) AS actual_qty
        FROM `tabWebsite Item` wi
        INNER JOIN `tabItem` i ON i.name = wi.item_code
        LEFT JOIN `tabItem Price` ip
            ON ip.item_code = wi.item_code
            AND ip.price_list = 'Standard Selling'
            AND ip.selling = 1
        LEFT JOIN `tabBin` bin
            ON bin.item_code = wi.item_code
            {warehouse_condition}
        WHERE
            wi.published = 1
            AND wi.item_code != %(item_code)s
            AND i.item_group = %(item_group)s
            AND i.disabled = 0
        GROUP BY
            wi.item_code,
            wi.web_item_name,
            wi.route,
            wi.website_image,
            i.item_group
        {having_condition}
        ORDER BY wi.modified DESC
        LIMIT %(limit)s
        """,
        values,
        as_dict=True,
    )

    for product in products:
        product.price_display = ""
        if flt(product.price_list_rate) > 0:
            product.price_display = f"{flt(product.price_list_rate):,.2f} LE"

    return products