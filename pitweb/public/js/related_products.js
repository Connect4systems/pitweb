frappe.ready(function () {
    if (window.__pitwebRfqFixInstalled) {
        return;
    }
    window.__pitwebRfqFixInstalled = true;

    const WHATSAPP_NUMBER = "201507447504";
    const RFQ_PENDING_KEY = "pitweb_rfq_pending";
    let stockVisibilitySyncScheduled = false;
    let autoNextInProgress = false;

    function getSidCookieValue() {
        const match = document.cookie.match(/(?:^|;\s*)sid=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : "";
    }

    function isGuestUser() {
        const sid = getSidCookieValue();
        if (sid) {
            return sid === "Guest";
        }

        return !!(
            window.frappe &&
            frappe.session &&
            frappe.session.user &&
            frappe.session.user === "Guest"
        );
    }

    function isLoggedInUser() {
        const sid = getSidCookieValue();
        if (sid) {
            return sid !== "Guest";
        }

        return !!(
            window.frappe &&
            frappe.session &&
            frappe.session.user &&
            frappe.session.user !== "Guest"
        );
    }

    function getLoginUrl() {
        const redirectTo = window.location.pathname + window.location.search + window.location.hash;
        return "/login?redirect-to=" + encodeURIComponent(redirectTo || "/cart");
    }

    function isRfqTrigger(element) {
        if (!element) return false;

        const text = (element.textContent || element.value || "").trim().toLowerCase();
        if (!text) return false;

        return (
            text.indexOf("request for quote") !== -1 ||
            text.indexOf("request for quotation") !== -1 ||
            text.indexOf("طلب عرض") !== -1
        );
    }

    function hasPermissionDeniedContent() {
        const text = (
            document.body && document.body.innerText ? document.body.innerText : ""
        ).toLowerCase();

        if (!text) return false;

        return (
            text.indexOf("لا يسمح") !== -1 ||
            text.indexOf("not permitted") !== -1 ||
            text.indexOf("insufficient permission") !== -1
        );
    }

    function handleGuestRfqClick(event) {
        const trigger = event.target.closest("button, input[type='button'], input[type='submit'], a");
        if (!trigger || !isRfqTrigger(trigger)) {
            return;
        }

        if (isLoggedInUser()) {
            try {
                window.sessionStorage.setItem(RFQ_PENDING_KEY, String(Date.now()));
            } catch (e) {
                // Ignore storage failures and continue normal flow.
            }
            return;
        }

        if (!isGuestUser()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        window.location.href = getLoginUrl();
    }

    function handleLoggedInQuotationFallback() {
        const path = window.location.pathname || "";
        if (!path.startsWith("/quotations/")) {
            return;
        }

        let rfqPending = false;
        try {
            rfqPending = !!window.sessionStorage.getItem(RFQ_PENDING_KEY);
        } catch (e) {
            rfqPending = false;
        }

        if (rfqPending && isLoggedInUser()) {
            try {
                window.sessionStorage.removeItem(RFQ_PENDING_KEY);
            } catch (e) {
                // Ignore storage failures.
            }
            window.location.replace("/cart?rfq_submitted=1");
            return;
        }

        if (!isLoggedInUser()) {
            return;
        }

        if (hasPermissionDeniedContent()) {
            window.location.replace("/cart?rfq_submitted=1");
            return;
        }

        let checks = 0;
        const timer = window.setInterval(function () {
            checks += 1;
            if (hasPermissionDeniedContent()) {
                window.clearInterval(timer);
                window.location.replace("/cart?rfq_submitted=1");
                return;
            }

            if (checks >= 10) {
                window.clearInterval(timer);
            }
        }, 400);
    }

    function handleRfqSubmittedNotice() {
        const path = window.location.pathname || "";
        if (path !== "/cart") {
            return;
        }

        const params = new URLSearchParams(window.location.search || "");
        if (params.get("rfq_submitted") !== "1") {
            return;
        }

        if (window.frappe && typeof frappe.show_alert === "function") {
            let message = "Request for Quotation submitted successfully";
            if (typeof window.__ === "function") {
                message = window.__(message);
            }
            frappe.show_alert({ message: message, indicator: "green" });
        }

        params.delete("rfq_submitted");
        const nextQuery = params.toString();
        const nextUrl = path + (nextQuery ? "?" + nextQuery : "") + (window.location.hash || "");
        window.history.replaceState({}, "", nextUrl);

        try {
            window.sessionStorage.removeItem(RFQ_PENDING_KEY);
        } catch (e) {
            // Ignore storage failures.
        }
    }

    function isProductsRoute() {
        const path = window.location.pathname || "";
        return path.includes("/products") || path.includes("/all-products");
    }

    function forceProductGridView() {
        if (!isProductsRoute()) return;

        const applyGrid = function () {
            const gridBtn = document.querySelector(".btn-grid-view");
            const listBtn = document.querySelector(".btn-list-view");

            if (!gridBtn) return;

            // If list is currently active, switch back to standard card/grid view.
            if (listBtn && listBtn.classList.contains("btn-primary")) {
                gridBtn.click();
            }
        };

        applyGrid();
        [300, 800, 1500, 3000].forEach(function (ms) {
            setTimeout(applyGrid, ms);
        });

        if (typeof MutationObserver !== "undefined") {
            const observer = new MutationObserver(function () {
                applyGrid();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }

    function hideSubCategoryBlueChips() {
        if (!isProductsRoute()) return;

        const hideChips = function () {
            // Keep product detail pages untouched.
            if (document.querySelector(".product-page-content")) return;

            document
                .querySelectorAll(".sub-category-container.scroll-categories")
                .forEach(function (node) {
                    node.style.display = "none";
                });
        };

        hideChips();
        [300, 800, 1500, 3000].forEach(function (ms) {
            setTimeout(hideChips, ms);
        });

        if (typeof MutationObserver !== "undefined") {
            const observer = new MutationObserver(function () {
                hideChips();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }

    function isProductListingPage() {
        if (!isProductsRoute()) return false;

        // Do not run stock filtering on the product detail page.
        if (document.querySelector(".product-page-content")) return false;

        return true;
    }

    function normalizeRoute(pathOrUrl) {
        if (!pathOrUrl) return "";

        let pathname = "";
        try {
            pathname = new URL(pathOrUrl, window.location.origin).pathname || "";
        } catch (e) {
            pathname = pathOrUrl;
        }

        pathname = String(pathname).split("?", 1)[0].split("#", 1)[0];
        if (!pathname) return "";

        return "/" + pathname.replace(/^\/+|\/+$/g, "");
    }

    function getProductNode(anchor) {
        if (!anchor) return null;

        return (
            anchor.closest(".product-card") ||
            anchor.closest(".product-list-link") ||
            anchor.closest(".item-card") ||
            anchor.closest(".product") ||
            anchor.closest(".card") ||
            anchor
        );
    }

    function getListingProductNodesByRoute() {
        const routeNodes = {};
        const selectors = [
            "a.product-link[href*='/products/']",
            "a.product-list-link[href*='/products/']",
            ".product-card a[href*='/products/']",
            ".item-card a[href*='/products/']",
            ".product a[href*='/products/']",
        ];

        const anchors = document.querySelectorAll(selectors.join(","));

        anchors.forEach(function (anchor) {
            const route = normalizeRoute(anchor.getAttribute("href"));
            if (!route || !route.startsWith("/products/")) return;

            const node = getProductNode(anchor);
            if (!node) return;

            if (!routeNodes[route]) {
                routeNodes[route] = [];
            }

            routeNodes[route].push(node);
        });

        return routeNodes;
    }

    function setProductNodeVisibility(node, visible) {
        if (!node) return;

        if (visible) {
            node.style.removeProperty("display");
            return;
        }

        node.style.display = "none";
    }

    function applyListingStockVisibility() {
        if (!isProductListingPage()) return;

        const routeNodes = getListingProductNodesByRoute();
        const routes = Object.keys(routeNodes);

        if (!routes.length) return;

        frappe.call({
            method: "pitweb.api.get_website_items_stock_by_route",
            args: {
                routes: routes,
            },
            callback: function (r) {
                const payload = r && r.message ? r.message : {};
                const showOnlyAvailable = Boolean(payload.show_only_available);
                const items = payload.items || {};

                routes.forEach(function (route) {
                    const info = items[route] || {};
                    const inStock = Boolean(info.in_stock);
                    const visible = !showOnlyAvailable || inStock;

                    (routeNodes[route] || []).forEach(function (node) {
                        setProductNodeVisibility(node, visible);
                    });
                });

                // If the current page becomes empty after stock filtering,
                // move to the next page (if available) to avoid a blank first page.
                if (showOnlyAvailable) {
                    maybeAutoAdvanceToNextPage();
                }
            },
        });
    }

    function maybeAutoAdvanceToNextPage() {
        if (autoNextInProgress) return;

        const allItemCards = Array.from(document.querySelectorAll(".item-card"));
        if (!allItemCards.length) return;

        const visibleCards = allItemCards.filter(function (node) {
            return node.style.display !== "none";
        });

        if (visibleCards.length > 0) return;

        const nextButton = document.querySelector("button.btn-next:not([disabled])");
        if (!nextButton) return;

        autoNextInProgress = true;
        nextButton.click();

        setTimeout(function () {
            autoNextInProgress = false;
        }, 1800);
    }

    function scheduleListingStockVisibilitySync() {
        if (stockVisibilitySyncScheduled) return;

        stockVisibilitySyncScheduled = true;
        setTimeout(function () {
            stockVisibilitySyncScheduled = false;
            applyListingStockVisibility();
        }, 120);
    }

    function setupListingStockVisibilityWatcher() {
        if (!isProductListingPage()) return;

        scheduleListingStockVisibilitySync();
        [300, 800, 1500, 3000].forEach(function (ms) {
            setTimeout(scheduleListingStockVisibilitySync, ms);
        });

        if (typeof MutationObserver !== "undefined") {
            const observer = new MutationObserver(function () {
                scheduleListingStockVisibilitySync();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }


    function renderRelatedProducts() {
        if (!window.location.pathname.includes("/products/")) return;

        frappe.call({
            method: "pitweb.api.get_related_products",
            args: {
                route: window.location.pathname,
                limit: 30
            },
            callback: function (r) {
                if (!r.message || !r.message.length) return;

                $(".c4-related-products-section").remove();

                let products = r.message;

                let html = `
                    <section class="c4-related-products-section">
                        <div class="c4-related-container">
                            <h2 class="c4-related-title">Related Products</h2>
                            <div class="c4-related-title-line"></div>

                            <button class="c4-related-arrow c4-related-prev" type="button">&#10094;</button>

                            <div class="c4-related-scroll" id="c4-related-scroll">
                `;

                products.forEach(function (product) {
                    let productUrl = "/" + product.route;
                    let image = product.website_image || "/assets/erpnext/images/ui-states/default-image.png";
                    let name = product.web_item_name || product.item_code;
                    let price = product.price_display ? product.price_display : "";

                    let whatsappText = encodeURIComponent(
                        "Hello, I want to ask about this product:\n" +
                        name + "\n" +
                        window.location.origin + productUrl
                    );

                    html += `
                        <div class="c4-related-card">
                            <a href="${productUrl}" class="c4-related-image-link">
                                <div class="c4-related-image-box">
                                    <img src="${image}" class="c4-related-image" alt="${name}">
                                </div>
                            </a>

                            <a href="${productUrl}" class="c4-related-name">${name}</a>

                            <div class="c4-related-price">${price}</div>

                            <div class="c4-related-actions">
                                <a href="${productUrl}" class="c4-related-view">View</a>
                                <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}"
                                   target="_blank"
                                   class="c4-related-whatsapp">WhatsApp</a>
                            </div>
                        </div>
                    `;
                });

                html += `
                            </div>

                            <button class="c4-related-arrow c4-related-next" type="button">&#10095;</button>
                        </div>
                    </section>
                `;

                let productPageContent = $(".product-page-content").first();

if (productPageContent.length) {
    productPageContent.after(html);
} else {
    $("footer, .web-footer").first().before(html);
}

                let scrollBox = document.getElementById("c4-related-scroll");
                if (!scrollBox) return;

                $(".c4-related-next").on("click", function () {
                    scrollBox.scrollBy({ left: 250, behavior: "smooth" });
                });

                $(".c4-related-prev").on("click", function () {
                    scrollBox.scrollBy({ left: -250, behavior: "smooth" });
                });

                setInterval(function () {
                    if (!scrollBox) return;

                    if (scrollBox.scrollLeft + scrollBox.clientWidth >= scrollBox.scrollWidth - 10) {
                        scrollBox.scrollTo({ left: 0, behavior: "smooth" });
                    } else {
                        scrollBox.scrollBy({ left: 250, behavior: "smooth" });
                    }
                }, 3000);
            }
        });
    }

    renderRelatedProducts();
    forceProductGridView();
    hideSubCategoryBlueChips();
    setupListingStockVisibilityWatcher();
    document.addEventListener("click", handleGuestRfqClick, true);
    handleLoggedInQuotationFallback();
    handleRfqSubmittedNotice();
});
