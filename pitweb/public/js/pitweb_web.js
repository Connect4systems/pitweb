(function () {
  "use strict";

  var pitThemeSettings = null;
  var pitNavData = null;

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

  function getCurrentLangCode() {
    var url = new URL(window.location.href);
    var param = (url.searchParams.get("lang") || "").toLowerCase();
    if (param === "ar" || param.indexOf("ar-") === 0) {
      return "ar";
    }

    if (param === "en" || param.indexOf("en-") === 0) {
      return "en";
    }

    return isArabic() ? "ar" : "en";
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

  function buildLanguageSwitcher() {
    var language = document.createElement("div");
    language.className = "pit-language-switch";

    var currentLang = getCurrentLangCode();
    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "pit-language-trigger";
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML =
      '<span class="pit-flag">' +
      (currentLang === "ar" ? "🇪🇬" : "🇬🇧") +
      "</span>" +
      '<span class="pit-language-label">' +
      (currentLang === "ar" ? "العربية" : "English") +
      "</span>" +
      '<span class="pit-language-caret">▾</span>';

    var menu = document.createElement("div");
    menu.className = "pit-language-menu";

    var options = [
      { code: "ar", label: "العربية", flag: "🇪🇬" },
      { code: "en", label: "English", flag: "🇬🇧" },
    ];

    options.forEach(function (option) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "pit-language-option" + (currentLang === option.code ? " is-active" : "");
      item.innerHTML =
        '<span class="pit-flag">' + option.flag + '</span><span class="pit-language-label">' + option.label + "</span>";
      item.addEventListener("click", function () {
        window.location.href = updateLanguageHref(option.code);
      });
      menu.appendChild(item);
    });

    trigger.addEventListener("click", function () {
      var open = language.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", function (event) {
      if (!language.contains(event.target)) {
        language.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    language.appendChild(trigger);
    language.appendChild(menu);
    return language;
  }

  function createSearchBar() {
    var wrap = document.createElement("form");
    wrap.className = "pit-top-search";
    wrap.setAttribute("role", "search");

    var input = document.createElement("input");
    input.type = "search";
    input.className = "pit-top-search-input";
    input.placeholder = t("Search products", "ابحث عن المنتجات");
    input.setAttribute("aria-label", t("Search products", "ابحث عن المنتجات"));

    var params = new URL(window.location.href).searchParams;
    input.value = params.get("search") || "";

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "pit-top-search-btn";
    submit.textContent = t("Search", "بحث");

    wrap.appendChild(input);
    wrap.appendChild(submit);
    return wrap;
  }

  function renderTopBar() {
    var navbar = document.querySelector(".navbar");
    if (!navbar || document.querySelector(".pit-topbar")) {
      return;
    }

    var topbar = document.createElement("div");
    topbar.className = "pit-topbar";

    var left = document.createElement("div");
    left.className = "pit-topbar-left";

    var logo = document.createElement("div");
    logo.className = "pit-topbar-logo";
    var brandSource = document.querySelector(".navbar-brand");

    if (pitThemeSettings && pitThemeSettings.brand_image) {
      var logoLink = document.createElement("a");
      logoLink.href = "/";
      logoLink.className = "pit-topbar-logo-link";

      var logoImage = document.createElement("img");
      logoImage.src = pitThemeSettings.brand_image;
      logoImage.alt = t("Brand", "العلامة التجارية");
      logoLink.appendChild(logoImage);
      logo.appendChild(logoLink);
    } else if (brandSource) {
      logo.innerHTML = brandSource.innerHTML;
    }

    left.appendChild(logo);

    var right = document.createElement("div");
    right.className = "pit-topbar-right";

    var social = document.createElement("div");
    social.className = "pit-social";
    var fb = (pitThemeSettings && pitThemeSettings.facebook_url) || "https://facebook.com";
    var yt = (pitThemeSettings && pitThemeSettings.youtube_url) || "https://youtube.com";
    var tt = (pitThemeSettings && pitThemeSettings.tiktok_url) || "https://tiktok.com";
    social.appendChild(createSocialLink(fb, t("Facebook", "فيسبوك"), "f"));
    social.appendChild(createSocialLink(yt, t("YouTube", "يوتيوب"), "▶"));
    social.appendChild(createSocialLink(tt, t("TikTok", "تيك توك"), "♪"));

    var search = createSearchBar();
    var language = buildLanguageSwitcher();

    right.appendChild(social);
    right.appendChild(search);
    right.appendChild(language);

    topbar.appendChild(left);
    topbar.appendChild(right);

    navbar.parentNode.insertBefore(topbar, navbar);
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, "");
  }

  function isProductsPage() {
    var path = normalizePath(window.location.pathname);
    return path === "/all-products" || path === "/products" || path.indexOf("/products/") === 0;
  }

  function normalizeRoute(path) {
    var route = String(path || "");
    route = route.replace(window.location.origin, "").replace(/^\//, "").replace(/\/+$/, "");
    return route;
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
      var group = String(groupName || "").trim();
      var options = Array.prototype.slice.call(filterSelect.options || []);
      var match = options.find(function (opt) {
        return String(opt.value || "").trim() === group;
      });

      if (!match) {
        match = options.find(function (opt) {
          return String(opt.textContent || "").trim().toLowerCase() === group.toLowerCase();
        });
      }

      if (match) {
        filterSelect.value = match.value;
      } else {
        filterSelect.value = group;
      }

      filterSelect.dispatchEvent(new Event("input", { bubbles: true }));
      filterSelect.dispatchEvent(new Event("change", { bubbles: true }));

      var currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("item_group", group);
      window.history.replaceState({}, "", currentUrl.toString());
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
    var selectedGroupName = currentSlug && navData.slug_to_group ? navData.slug_to_group[currentSlug] : null;
    var byName = {};
    groups.forEach(function (g) {
      byName[g.name] = g;
    });

    var displayGroups = groups;
    if (selectedGroupName) {
      var children = groups.filter(function (g) {
        return g.parent === selectedGroupName;
      });

      if (children.length) {
        displayGroups = [{ name: selectedGroupName, label: byName[selectedGroupName].label, slug: currentSlug }].concat(children);
      }
    }

    displayGroups.forEach(function (group) {
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
        window.location.href = "/products/" + group.slug;
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

      var route = normalizeRoute(path);
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

  function getActiveGroupName() {
    var slug = getCurrentCategorySlug();
    if (!slug || !pitNavData || !pitNavData.slug_to_group) {
      return null;
    }

    return pitNavData.slug_to_group[slug] || null;
  }

  function getProductCards() {
    return Array.prototype.slice.call(
      document.querySelectorAll(".website-item-card, .product-card, .products-section .card")
    );
  }

  function ensureCardRoutes() {
    getProductCards().forEach(function (card) {
      if (card.getAttribute("data-pit-route")) {
        return;
      }

      var link = card.querySelector('a[href*="/products/"]');
      if (!link) {
        return;
      }

      card.setAttribute("data-pit-route", normalizeRoute(link.getAttribute("href") || ""));
    });
  }

  function showSearchEmptyState(show) {
    var root = document.querySelector(".pit-products-body") || document.querySelector(".page_content") || document.body;
    var state = document.querySelector(".pit-search-empty");

    if (!show) {
      if (state) {
        state.remove();
      }
      return;
    }

    if (state) {
      return;
    }

    state = document.createElement("div");
    state.className = "pit-search-empty";
    state.textContent = t("No items matched your search.", "لا توجد منتجات مطابقة للبحث.");
    root.appendChild(state);
  }

  function filterCardsByRoutes(routes) {
    var allowed = new Set((routes || []).map(normalizeRoute));
    var visibleCount = 0;

    ensureCardRoutes();
    getProductCards().forEach(function (card) {
      var route = normalizeRoute(card.getAttribute("data-pit-route") || "");
      var visible = !allowed.size || allowed.has(route);
      card.style.display = visible ? "" : "none";
      if (visible) {
        visibleCount += 1;
      }
    });

    showSearchEmptyState(allowed.size > 0 && visibleCount === 0);
  }

  async function runProductSearch(searchText) {
    var text = String(searchText || "").trim();
    var activeGroup = getActiveGroupName();

    if (!text) {
      filterCardsByRoutes([]);
      var clearUrl = new URL(window.location.href);
      clearUrl.searchParams.delete("search");
      window.history.replaceState({}, "", clearUrl.toString());
      return;
    }

    var result = await callApi("pitweb.api.search_webshop_items", {
      query: text,
      item_group: activeGroup,
      limit: 500,
    });

    var routes = (result && result.routes) || [];
    filterCardsByRoutes(routes);

    var nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("search", text);
    window.history.replaceState({}, "", nextUrl.toString());
  }

  function bindTopSearch() {
    var form = document.querySelector(".pit-top-search");
    var input = form && form.querySelector(".pit-top-search-input");
    if (!form || !input) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var query = String(input.value || "").trim();

      if (isProductsPage()) {
        runProductSearch(query);
        return;
      }

      var url = new URL(window.location.origin + "/all-products");
      if (query) {
        url.searchParams.set("search", query);
      }
      window.location.href = url.toString();
    });
  }

  function applyInitialSearch() {
    if (!isProductsPage()) {
      return;
    }

    var query = new URL(window.location.href).searchParams.get("search") || "";
    if (!query) {
      return;
    }

    runProductSearch(query);
  }

  async function initializeWebshopUX() {
    await applyThemeSettings();
    setDirection();
    renderTopBar();

    pitNavData = await callApi("pitweb.api.get_webshop_navigation");
    if (pitNavData) {
      renderMegaMenu(pitNavData);
    }

    bindTopSearch();

    if (!isProductsPage()) {
      return;
    }

    applyGridClass();

    if (pitNavData) {
      createSidebar(pitNavData);
    }

    applyArabicCardContent();
    applyInitialSearch();
  }

  onReady(function () {
    initializeWebshopUX();
  });
})();
