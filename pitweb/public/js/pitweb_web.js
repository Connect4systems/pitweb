(function () {
  var RFQ_PENDING_KEY = "pitweb_rfq_pending";
  var RFQ_SUCCESS_FLAG = "rfq_submitted";
  var RFQ_RELOAD_GUARD = "pitweb_rfq_quotes_reloaded";

  function markRfqSubmitted() {
    try {
      window.sessionStorage.setItem(RFQ_PENDING_KEY, String(Date.now()));
    } catch (e) {
      // Ignore storage failures.
    }

    try {
      window.localStorage.setItem(RFQ_SUCCESS_FLAG, "1");
    } catch (e) {
      // Ignore storage failures.
    }
  }

  function getSidCookieValue() {
    var match = document.cookie.match(/(?:^|;\s*)sid=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function isGuestUser() {
    var sid = getSidCookieValue();
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
    var sid = getSidCookieValue();
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
    var redirectTo = window.location.pathname + window.location.search + window.location.hash;
    return "/login?redirect-to=" + encodeURIComponent(redirectTo || "/cart");
  }

  function isRfqTrigger(element) {
    if (!element) {
      return false;
    }

    var text = (element.textContent || element.value || "").trim().toLowerCase();
    if (!text) {
      return false;
    }

    return (
      text.indexOf("request for quote") !== -1 ||
      text.indexOf("request for quotation") !== -1 ||
      text.indexOf("طلب عرض") !== -1
    );
  }

  function handleGuestRfqClick(event) {
    var trigger = event.target.closest("button, input[type='button'], input[type='submit'], a");
    if (!trigger || !isRfqTrigger(trigger)) {
      return;
    }

    if (isLoggedInUser()) {
      markRfqSubmitted();
      return;
    }

    if (!isGuestUser()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.location.href = getLoginUrl();
  }

  function hasPermissionDeniedContent() {
    var text = (document.body && document.body.innerText ? document.body.innerText : "").toLowerCase();
    if (!text) {
      return false;
    }

    return (
      text.indexOf("لا يسمح") !== -1 ||
      text.indexOf("not permitted") !== -1 ||
      text.indexOf("insufficient permission") !== -1
    );
  }

  function handleLoggedInQuotationFallback() {
    var path = window.location.pathname || "";
    if (!path.startsWith("/quotations/")) {
      return;
    }

    var rfqPending = false;
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

    // Quotation detail route is not website-accessible for portal users.
    // Always send logged-in users back to cart to avoid login/permission loop.
    window.setTimeout(function () {
      if ((window.location.pathname || "").startsWith("/quotations/")) {
        window.location.replace("/cart?rfq_submitted=1");
      }
    }, 1200);

    // RFQ may be created successfully, but website user cannot open quotation detail route.
    if (hasPermissionDeniedContent()) {
      window.location.replace("/cart?rfq_submitted=1");
      return;
    }

    // Some themes render permission messages after initial load.
    var checks = 0;
    var timer = window.setInterval(function () {
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
    var path = window.location.pathname || "";
    if (path !== "/cart" && path !== "/quotations") {
      return;
    }

    var params = new URLSearchParams(window.location.search || "");
    var submitted = params.get("rfq_submitted") === "1";
    if (!submitted) {
      try {
        submitted = window.localStorage.getItem(RFQ_SUCCESS_FLAG) === "1";
      } catch (e) {
        submitted = false;
      }
    }

    if (!submitted) {
      return;
    }

    if (window.frappe && typeof frappe.show_alert === "function") {
      var message = "Your order is under review, thanks.";
      if (typeof window.__ === "function") {
        message = window.__(message);
      }
      frappe.show_alert({ message: message, indicator: "green" });
    }

    if (path === "/cart") {
      window.location.replace("/quotations?rfq_submitted=1");
      return;
    }

    try {
      if (window.localStorage.getItem(RFQ_RELOAD_GUARD) !== "1") {
        window.localStorage.setItem(RFQ_RELOAD_GUARD, "1");
        window.location.reload();
        return;
      }
      window.localStorage.removeItem(RFQ_RELOAD_GUARD);
    } catch (e) {
      // Ignore storage failures.
    }

    params.delete("rfq_submitted");
    var nextQuery = params.toString();
    var nextUrl = path + (nextQuery ? "?" + nextQuery : "") + (window.location.hash || "");
    window.history.replaceState({}, "", nextUrl);

    try {
      window.sessionStorage.removeItem(RFQ_PENDING_KEY);
    } catch (e) {
      // Ignore storage failures.
    }

    try {
      window.localStorage.removeItem(RFQ_SUCCESS_FLAG);
    } catch (e) {
      // Ignore storage failures.
    }
  }

  document.addEventListener("click", handleGuestRfqClick, true);
  handleLoggedInQuotationFallback();
  handleRfqSubmittedNotice();
})();
