(function () {
  var cfg = window.LeadBackupConfig || {};
  var SHEET_URL = cfg.googleScriptUrl || "";

  function postToSheet(payload) {
    if (!SHEET_URL) return;

    var formBody = new URLSearchParams({
      payload: JSON.stringify(payload)
    }).toString();

    // Use sendBeacon only if available
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(
          SHEET_URL,
          new Blob([formBody], { type: "application/x-www-form-urlencoded;charset=UTF-8" })
        );
        return; // IMPORTANT: stop here
      } catch (e) { }
    }

    // Fallback only when beacon is not used
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: formBody
    }).catch(function () { });
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
