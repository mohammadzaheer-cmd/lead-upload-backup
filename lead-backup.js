(function () {
  var cfg = window.LeadBackupConfig || {};
  var SHEET_URL = cfg.googleScriptUrl || "";

  function sendToSheet(payload) {
    if (!SHEET_URL) return;

    var body = new URLSearchParams({
      payload: JSON.stringify(payload)
    });

    // 1) Best effort on page unload/redirect
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body.toString()], {
          type: "application/x-www-form-urlencoded;charset=UTF-8"
        });
        navigator.sendBeacon(SHEET_URL, blob);
      }
    } catch (e) {}

    // 2) Regular request fallback
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body
    }).catch(function () {});
  }

  function patch() {
    if (typeof window.SendLead !== "function") {
      setTimeout(patch, 200);
      return;
    }

    var original = window.SendLead;

    window.SendLead = function (leadData, thankyouUrl) {
      if (cfg.projectId) leadData.project_id = Number(cfg.projectId);

      sendToSheet({
        event_id: "web_" + Date.now(),
        timestamp_local: new Date().toLocaleString(),
        page_url: location.href,
        page_title: document.title || "",
        referrer: document.referrer || "",
        user_agent: navigator.userAgent || "",
        form_id: leadData.tracking_lead_id || "default_tracking_id",
        crm_status: "attempted",
        crm_error: "",
        lead: leadData
      });

      return original.call(this, leadData, thankyouUrl);
    };
  }

  patch();
})();
