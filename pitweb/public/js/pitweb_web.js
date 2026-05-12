(function () {
  "use strict";

  var pitThemeSettings = null;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
      return;
    }
    fn();
  }

  function callApi(method, args) {
    return new Promise(function (resolve) {
      if (!window.frappe || !frappe.call) {
        resolve(null);
        return;
      }

      frappe.call({
        method: method,
        args: args || {},
        callback: function (r) {
          resolve(r && r.message ? r.message : null);
        },
        error: function () {
          resolve(null);
        },
      });
    });
  }

  function isArabic() {
    var htmlLang = (document.documentElement.lang || "").toLowerCase();
    if (htmlLang.indexOf("ar") === 0) {
      return true;
    }

    if (window.frappe && frappe.boot && frappe.boot.lang) {
      return String(frappe.boot.lang).toLowerCase().indexOf("ar") === 0;
    }

    return false;
  }

  function t(en, ar) {
    return isArabic() ? ar : en;
  }

  function appendStylesheet(href) {
    if (!href || document.querySelector('link[data-pit-font="' + href + '"]')) {
      return;
    }

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-pit-font", href);
    document.head.appendChild(link);
  }

  async function applyThemeSettings() {
    var theme = await callApi("pitweb.api.get_webshop_theme_settings");
    if (!theme) {
      return;
    }

    pitThemeSettings = theme;

    if (theme.base_font_url) {
      appendStylesheet(theme.base_font_url);
    }

    if (theme.arabic_font_url) {
      appendStylesheet(theme.arabic_font_url);
    }

    var style = document.documentElement.style;
    style.setProperty("--pit-red", theme.primary_color || "#d71920");
    style.setProperty("--pit-text", theme.dark_text_color || "#1f1f1f");
    style.setProperty("--pit-light", theme.light_background_color || "#f7f7f7");
    style.setProperty("--pit-white", theme.card_background_color || "#ffffff");
    style.setProperty("--pit-border", theme.border_color || "#e5e5e5");
    style.setProperty("--pit-font-family", theme.base_font_family || "Poppins, sans-serif");
    style.setProperty("--pit-ar-font-family", theme.arabic_font_family || "Cairo, sans-serif");
  }

  function setDirection() {
    if (isArabic()) {
      document.body.setAttribute("dir", "rtl");
      document.documentElement.setAttribute("dir", "rtl");
      document.body.classList.add("pit-rtl");
      return;
    }

    document.body.setAttribute("dir", "ltr");
    document.documentElement.setAttribute("dir", "ltr");
    document.body.classList.remove("pit-rtl");
  }

  function createLink(href, label, className) {
    var link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    if (className) {
      link.className = className;
    }
    return link;
  }

  function createSocialLink(href, label, icon) {
    var link = createLink(href, label, "pit-social-link");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", label);

    var iconSpan = document.createElement("span");
    iconSpan.className = "pit-social-icon";
    iconSpan.textContent = icon;

    var textSpan = document.createElement("span");
    textSpan.className = "pit-social-text";
    textSpan.textContent = label;

    link.textContent = "";
    link.appendChild(iconSpan);
    link.appendChild(textSpan);
    return link;
  }

  function updateLanguageHref(langCode) {
    var url = new URL(window.location.href);
    url.searchParams.set("lang", langCode);
    return url.toString();
  }

  function renderTopBar() {
    var navbar = document.querySelector(".navbar");
    if (!navbar || document.querySelector(".pit-topbar")) {
      return;
    }

    var topbar = document.createElement("div");
    topbar.className = "pit-topbar";

    var logo = document.createElement("div");
    logo.className = "pit-topbar-logo";
    var brandSource = document.querySelector(".navbar-brand");
    if (brandSource) {
      logo.innerHTML = brandSource.innerHTML;
    }

    var social = document.createElement("div");
    social.className = "pit-social";
    var fb = (pitThemeSettings && pitThemeSettings.facebook_url) || "https://facebook.com";
    var yt = (pitThemeSettings && pitThemeSettings.youtube_url) || "https://youtube.com";
    var tt = (pitThemeSettings && pitThemeSettings.tiktok_url) || "https://tiktok.com";
    social.appendChild(createSocialLink(fb, t("Facebook", "فيسبوك"), "f"));
    social.appendChild(createSocialLink(yt, t("YouTube", "يوتيوب"), "▶"));
    social.appendChild(createSocialLink(tt, t("TikTok", "تيك توك"), "♪"));

    var language = document.createElement("div");
    language.className = "pit-language-switch";

    var isAr = isArabic();
    var english = createLink(updateLanguageHref("en"), t("EN", "الانجليزية"), isAr ? "" : "is-active");
    var arabic = createLink(updateLanguageHref("ar"), t("AR", "العربية"), isAr ? "is-active" : "");

    language.appendChild(english);
    language.appendChild(arabic);

    topbar.appendChild(logo);
    topbar.appendChild(social);
    topbar.appendChild(language);

    navbar.parentNode.insertBefore(topbar, navbar);
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, "");
  }

  function isProductsPage() {
    var path = normalizePath(window.location.pathname);
    return path === "/all-products" || path === "/products" || path.indexOf("/products/") === 0;
  }

  function applyGridClass() {
    var gridRoots = document.querySelectorAll(".products-section, .product-listing, .item-list");
    gridRoots.forEach(function (root) {
      root.classList.add("pit-product-grid");
    });

    var cards = document.querySelectorAll(".website-item-card, .product-card, .products-section .card");
    cards.forEach(function (card) {
      card.classList.add("pit-product-card");
    });
  }

  function getCurrentCategorySlug() {
    var path = normalizePath(window.location.pathname);
    if (path.indexOf("/products/") !== 0) {
      return null;
    }

    var tokens = path.split("/").filter(Boolean);
    return tokens.length > 1 ? tokens[1] : null;
  }

  function filterByCategory(groupName) {
    var filterSelect = document.querySelector(
      'select[name="item_group"], .item-group-filter select, select[data-fieldname="item_group"]'
    );

    if (filterSelect) {
      filterSelect.value = groupName;
      filterSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    var target = new URL(window.location.origin + "/all-products");
    target.searchParams.set("item_group", groupName);
    window.location.href = target.toString();
  }

  function createSidebar(navData) {
    var groups = navData && navData.groups ? navData.groups : [];
    if (!groups.length || document.querySelector(".pit-category-sidebar")) {
      return;
    }

    var contentRoot = document.querySelector(".page_content") || document.querySelector(".container");
    if (!contentRoot) {
      return;
    }

    var layout = document.createElement("div");
    layout.className = "pit-products-layout";

    var sidebar = document.createElement("aside");
    sidebar.className = "pit-category-sidebar";
    sidebar.innerHTML = "<h5>" + t("Categories", "الفئات") + "</h5>";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pit-sidebar-toggle";
    toggle.textContent = t("Categories", "الفئات");
    toggle.addEventListener("click", function () {
      sidebar.classList.toggle("is-open");
    });

    var list = document.createElement("ul");
    var currentSlug = getCurrentCategorySlug();

    groups.forEach(function (group) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = "/products/" + group.slug;
      link.textContent = group.label;
      if (currentSlug && currentSlug === group.slug) {
        link.classList.add("is-active");
      }

      link.addEventListener("click", function (event) {
        event.preventDefault();
        filterByCategory(group.name);
        window.history.pushState({}, "", "/products/" + group.slug);
      });

      li.appendChild(link);
      list.appendChild(li);
    });

    sidebar.appendChild(list);

    var body = document.createElement("div");
    body.className = "pit-products-body";

    while (contentRoot.firstChild) {
      body.appendChild(contentRoot.firstChild);
    }

    layout.appendChild(toggle);
    layout.appendChild(sidebar);
    layout.appendChild(body);
    contentRoot.appendChild(layout);

    if (currentSlug && navData.slug_to_group && navData.slug_to_group[currentSlug]) {
      filterByCategory(navData.slug_to_group[currentSlug]);
    }
  }

  function renderMegaMenu(navData) {
    var tree = navData && navData.tree ? navData.tree : [];
    if (!tree.length) {
      return;
    }

    var navList = document.querySelector(".navbar .navbar-nav");
    if (!navList || navList.querySelector(".pit-mega-root")) {
      return;
    }

    var li = document.createElement("li");
    li.className = "nav-item dropdown pit-mega-root";

    var toggle = document.createElement("a");
    toggle.className = "nav-link";
    toggle.href = "/products";
    toggle.textContent = isArabic() ? "المنتجات" : "Products";

    var panel = document.createElement("div");
    panel.className = "pit-mega-panel";

    var grid = document.createElement("div");
    grid.className = "pit-mega-grid";

    tree.forEach(function (group) {
      var col = document.createElement("div");
      col.className = "pit-mega-col";

      var title = document.createElement("h6");
      var titleLink = createLink("/products/" + group.slug, group.label);
      title.appendChild(titleLink);
      col.appendChild(title);

      var list = document.createElement("ul");
      (group.children || []).forEach(function (child) {
        var item = document.createElement("li");
        item.appendChild(createLink("/products/" + child.slug, child.label));
        list.appendChild(item);
      });

      col.appendChild(list);
      grid.appendChild(col);
    });

    panel.appendChild(grid);
    li.appendChild(toggle);
    li.appendChild(panel);

    toggle.addEventListener("click", function (event) {
      if (window.innerWidth <= 992) {
        event.preventDefault();
        li.classList.toggle("is-open");
      }
    });

    navList.appendChild(li);
  }

  async function applyArabicCardContent() {
    if (!isArabic()) {
      return;
    }

    var cards = document.querySelectorAll(".website-item-card, .product-card, .products-section .card");
    if (!cards.length) {
      return;
    }

    var routes = [];
    cards.forEach(function (card) {
      var link = card.querySelector('a[href*="/products/"]');
      if (!link) {
        return;
      }

      var path = link.getAttribute("href") || "";
      if (!path) {
        return;
      }

      var route = path.replace(window.location.origin, "").replace(/^\//, "");
      routes.push(route);
      card.setAttribute("data-pit-route", route);
    });

    if (!routes.length) {
      return;
    }

    var payload = await callApi("pitweb.api.get_arabic_content_for_routes", { routes: routes });
    if (!payload) {
      return;
    }

    cards.forEach(function (card) {
      var route = card.getAttribute("data-pit-route");
      var values = payload[route];
      if (!values) {
        return;
      }

      var title = card.querySelector(".item-name, .product-title, .card-title");
      var desc = card.querySelector(".item-description, .card-text, .text-muted");

      if (title && values.name) {
        title.textContent = values.name;
      }

      if (desc && values.description) {
        desc.innerHTML = values.description;
      }
    });
  }

  async function initializeWebshopUX() {
    await applyThemeSettings();
    setDirection();
    renderTopBar();

    var navData = await callApi("pitweb.api.get_webshop_navigation");
    if (navData) {
      renderMegaMenu(navData);
    }

    if (!isProductsPage()) {
      return;
    }

    applyGridClass();

    if (navData) {
      createSidebar(navData);
    }

    applyArabicCardContent();
  }

  onReady(function () {
    initializeWebshopUX();
  });
})();
