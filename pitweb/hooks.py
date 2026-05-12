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
website_route_rules = [
	{"from_route": "/products", "to_route": "all-products"},
	{"from_route": "/products/<category_slug>", "to_route": "all-products"},
]

doc_events = {
	"Website Item": {
		"validate": "pitweb.webshop.on_website_item_validate",
	},
	"Item": {
		"on_update": "pitweb.webshop.on_item_update",
	},
}
