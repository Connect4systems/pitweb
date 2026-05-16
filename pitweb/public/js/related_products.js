frappe.ready(function () {
    const WHATSAPP_NUMBER = "201507447504";

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

    function removeAppItemGroupFilterOption() {
        if (!window.location.pathname.includes("/products")) return;

        const normalize = function (text) {
            return (text || "").trim().toLowerCase();
        };

        const removeMatchingOption = function () {
            $("label, .form-check, .checkbox").each(function () {
                const text = normalize($(this).text());
                if (text === "app") {
                    $(this).remove();
                }
            });
        };

        removeMatchingOption();

        const container = document.querySelector("body");
        if (!container || typeof MutationObserver === "undefined") return;

        const observer = new MutationObserver(function () {
            removeMatchingOption();
        });

        observer.observe(container, {
            childList: true,
            subtree: true,
        });
    }

    removeAppItemGroupFilterOption();
});
