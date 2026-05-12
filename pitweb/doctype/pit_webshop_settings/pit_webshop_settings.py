from frappe.model.document import Document
from frappe.utils import cstr
from urllib.parse import urlparse

import frappe


def _is_hex_color(value):
    text = cstr(value or "").strip()
    if len(text) != 7 or not text.startswith("#"):
        return False

    try:
        int(text[1:], 16)
        return True
    except ValueError:
        return False


def _is_valid_url(value):
    text = cstr(value or "").strip()
    if not text:
        return True

    parsed = urlparse(text)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


class PITWebshopSettings(Document):
    def validate(self):
        for field in [
            "primary_color",
            "dark_text_color",
            "light_background_color",
            "card_background_color",
            "border_color",
        ]:
            if not _is_hex_color(self.get(field)):
                frappe.throw(f"{field} must be a valid hex color like #d71920")

        for field in [
            "base_font_url",
            "arabic_font_url",
            "facebook_url",
            "youtube_url",
            "tiktok_url",
        ]:
            if not _is_valid_url(self.get(field)):
                frappe.throw(f"{field} must be a valid http/https URL")
