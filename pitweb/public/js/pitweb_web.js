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
    if (!navbar) {
      return;
    }

    var navCollapse = navbar.querySelector(".navbar-collapse");
    if (!navCollapse || navCollapse.querySelector(".pit-navbar-tools")) {
      return;
    }

    var tools = document.createElement("div");
    tools.className = "pit-navbar-tools";

    var language = buildLanguageSwitcher();
    language.classList.add("pit-navbar-language");
    tools.appendChild(language);

    navCollapse.appendChild(tools);
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

  function buildProductsUrl(groupName, slug) {
    var url = new URL(window.location.origin + "/all-products");
    if (groupName) {
      url.searchParams.set("item_group", groupName);
    }
    if (slug) {
      url.searchParams.set("pit_group_slug", slug);
    }
    return url.toString();
  }

  function syncCategoryUrl(groupName, slug) {
    var currentUrl = new URL(window.location.href);
    var nextGroup = String(groupName || "").trim();
    var nextSlug = String(slug || "").trim();
    var changed = false;

    if (nextGroup) {
      if (currentUrl.searchParams.get("item_group") !== nextGroup) {
        currentUrl.searchParams.set("item_group", nextGroup);
        changed = true;
      }
    } else if (currentUrl.searchParams.has("item_group")) {
      currentUrl.searchParams.delete("item_group");
      changed = true;
    }

    if (nextSlug) {
      if (currentUrl.searchParams.get("pit_group_slug") !== nextSlug) {
        currentUrl.searchParams.set("pit_group_slug", nextSlug);
        changed = true;
      }
    } else if (currentUrl.searchParams.has("pit_group_slug")) {
      currentUrl.searchParams.delete("pit_group_slug");
      changed = true;
    }

    if (changed) {
      window.history.replaceState({}, "", currentUrl.toString());
    }
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
      var urlSlug = new URL(window.location.href).searchParams.get("pit_group_slug");
      return urlSlug || null;
    }

    var tokens = path.split("/").filter(Boolean);
    return tokens.length > 1 ? tokens[1] : null;
  }

  function filterCardsByGroupSlug(slug) {
    var normalizedSlug = String(slug || "").trim().toLowerCase();
    if (!normalizedSlug) {
      return { total: 0, inspected: 0, visible: 0 };
    }

    var cards = Array.prototype.slice.call(
      document.querySelectorAll(".website-item-card, .product-card, .products-section .card")
    );

    var inspected = 0;
    var visible = 0;

    cards.forEach(function (card) {
      var link = card.querySelector('a[href*="/products/"]');
      if (!link) {
        return;
      }

      inspected += 1;

      var route = normalizeRoute(link.getAttribute("href") || "");
      var routeTokens = route.split("/").filter(Boolean);
      var cardSlug = routeTokens.length > 1 ? String(routeTokens[1]).toLowerCase() : "";
      var isVisible = cardSlug === normalizedSlug;
      card.style.display = isVisible ? "" : "none";
      if (isVisible) {
        visible += 1;
      }
    });

    return { total: cards.length, inspected: inspected, visible: visible };
  }

  function filterByCategory(groupName, slug) {
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

      syncCategoryUrl(group, slug);
      return true;
    }

    syncCategoryUrl(groupName, slug);
    return false;
  }

  function extractCategorySlugFromHref(href) {
    var route = normalizeRoute(href || "");
    var tokens = route.split("/").filter(Boolean);
    if (tokens.length !== 2 || tokens[0] !== "products") {
      return null;
    }

    return tokens[1] || null;
  }

  function rewriteCategoryLinks(navData) {
    var slugToGroup = (navData && navData.slug_to_group) || {};
    var links = document.querySelectorAll('a[href]');

    links.forEach(function (link) {
      var rawHref = String(link.getAttribute("href") || "").trim();
      if (!rawHref) {
        return;
      }

      if (
        rawHref.indexOf("#") === 0 ||
        rawHref.indexOf("mailto:") === 0 ||
        rawHref.indexOf("tel:") === 0 ||
        rawHref.indexOf("javascript:") === 0
      ) {
        return;
      }

      var slug = extractCategorySlugFromHref(rawHref);
      if (!slug) {
        return;
      }

      var groupName = slugToGroup[slug];
      link.setAttribute("href", buildProductsUrl(groupName || "", slug));
    });
  }

  function applyCategoryFromUrl(retryCount) {
    if (!isProductsPage()) {
      return;
    }

    var url = new URL(window.location.href);
    var groupName = (url.searchParams.get("item_group") || "").trim();
    var slug = (url.searchParams.get("pit_group_slug") || "").trim();
    if (!groupName && !slug) {
      return;
    }

    var retries = retryCount || 0;
    var needsRetry = false;

    if (groupName) {
      var filterSelect = document.querySelector(
        'select[name="item_group"], .item-group-filter select, select[data-fieldname="item_group"]'
      );

      if (filterSelect) {
        filterByCategory(groupName, slug);
      } else if (retries < 20) {
        needsRetry = true;
      }
    }

    if (slug) {
      var result = filterCardsByGroupSlug(slug);
      if ((result.total === 0 || result.inspected === 0) && retries < 20) {
        needsRetry = true;
      }
    }

    if (needsRetry) {
      setTimeout(function () {
        applyCategoryFromUrl(retries + 1);
      }, 250);
    }
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
        var selectedLabel = byName[selectedGroupName] ? byName[selectedGroupName].label : selectedGroupName;
        displayGroups = [{ name: selectedGroupName, label: selectedLabel, slug: currentSlug }].concat(children);
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
        window.location.href = buildProductsUrl(group.name, group.slug);
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
      filterByCategory(navData.slug_to_group[currentSlug], currentSlug);
      filterCardsByGroupSlug(currentSlug);
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
      var titleLink = createLink(buildProductsUrl(group.name, group.slug), group.label);
      title.appendChild(titleLink);
      col.appendChild(title);

      var list = document.createElement("ul");
      (group.children || []).forEach(function (child) {
        var item = document.createElement("li");
        item.appendChild(createLink(buildProductsUrl(child.name, child.slug), child.label));
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
    var fromParam = (new URL(window.location.href).searchParams.get("item_group") || "").trim();
    if (fromParam) {
      return fromParam;
    }

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
    var activeSlug = (getCurrentCategorySlug() || "").trim();

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
      item_group_slug: activeSlug,
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

  async function applyStrictCategoryFilterFromUrl(retryCount) {
    if (!isProductsPage()) {
      return;
    }

    var url = new URL(window.location.href);
    var searchText = (url.searchParams.get("search") || "").trim();
    if (searchText) {
      return;
    }

    var groupName = (url.searchParams.get("item_group") || "").trim();
    var slug = (url.searchParams.get("pit_group_slug") || "").trim();

    if (!groupName && slug && pitNavData && pitNavData.slug_to_group) {
      groupName = String(pitNavData.slug_to_group[slug] || "").trim();
    }

    if (!groupName) {
      return;
    }

    var retries = retryCount || 0;
    var cards = getProductCards();
    var linkedCards = cards.filter(function (card) {
      return !!card.querySelector('a[href*="/products/"]');
    });

    if ((cards.length === 0 || linkedCards.length === 0) && retries < 20) {
      setTimeout(function () {
        applyStrictCategoryFilterFromUrl(retries + 1);
      }, 250);
      return;
    }

    var result = await callApi("pitweb.api.get_webshop_item_routes", {
      item_group: groupName,
      item_group_slug: slug,
      limit: 5000,
    });

    var routes = (result && result.routes) || [];
    filterCardsByRoutes(routes);

    if (slug) {
      filterCardsByGroupSlug(slug);
    }
  }

  async function initializeWebshopUX() {
    try {
      await applyThemeSettings();
      setDirection();
      renderTopBar();

      pitNavData = await callApi("pitweb.api.get_webshop_navigation");
      if (pitNavData) {
        rewriteCategoryLinks(pitNavData);
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
      applyCategoryFromUrl(0);
      applyStrictCategoryFilterFromUrl(0);
      applyInitialSearch();

      var currentSlug = getCurrentCategorySlug();
      if (currentSlug) {
        filterCardsByGroupSlug(currentSlug);
      }
    } catch (error) {
      console.error("PIT webshop UX init failed", error);
    }
  }

  onReady(function () {
    initializeWebshopUX();
  });
})();
