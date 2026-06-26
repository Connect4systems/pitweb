(function () {
  var RFQ_PENDING_KEY = "pitweb_rfq_pending";

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
    if (path !== "/cart") {
      return;
    }

    var params = new URLSearchParams(window.location.search || "");
    if (params.get("rfq_submitted") !== "1") {
      return;
    }

    if (window.frappe && typeof frappe.show_alert === "function") {
      var message = "Request for Quotation submitted successfully";
      if (typeof window.__ === "function") {
        message = window.__(message);
      }
      frappe.show_alert({ message: message, indicator: "green" });
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
  }

  document.addEventListener("click", handleGuestRfqClick, true);
  handleLoggedInQuotationFallback();
  handleRfqSubmittedNotice();
})();
