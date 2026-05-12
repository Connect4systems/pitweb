from . import __version__ as app_version

app_name = "pitweb"
app_title = "Pitweb"
app_publisher = "Pitweb"
app_description = "Custom ERPNext app for Pitweb"
app_email = "admin@example.com"
app_license = "MIT"

web_include_css = ["/assets/pitweb/css/pitweb_web.css"]
web_include_js = ["/assets/pitweb/js/pitweb_web.js"]

# Support cleaner webshop routes while preserving ERPNext webshop behavior.
_RAW_WEBSITE_ROUTE_RULES = [
	{"from_route": "products", "to_route": "all-products"},
	{"from_route": "products/<category_slug>", "to_route": "all-products"},
]


def _normalize_route(rule):
	route = (rule.get("from_route") or "").strip()
	if route and not route.startswith("/"):
		route = f"/{route}"
	return {**rule, "from_route": route}


website_route_rules = [_normalize_route(rule) for rule in _RAW_WEBSITE_ROUTE_RULES]

doc_events = {
	"Website Item": {
		"validate": "pitweb.webshop.on_website_item_validate",
	},
	"Item": {
		"on_update": "pitweb.webshop.on_item_update",
	},
}
