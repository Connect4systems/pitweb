frappe.ready(function () {
    const WHATSAPP_NUMBER = "201507447504";
    let stockVisibilitySyncScheduled = false;
    let autoNextInProgress = false;

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
});
