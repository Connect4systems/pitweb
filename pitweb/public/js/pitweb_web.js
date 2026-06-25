(function () {
  function isGuestUser() {
    return !!(
      window.frappe &&
      frappe.session &&
      frappe.session.user &&
      frappe.session.user === "Guest"
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
    if (!trigger || !isRfqTrigger(trigger) || !isGuestUser()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.location.href = getLoginUrl();
  }

  document.addEventListener("click", handleGuestRfqClick, true);
})();
