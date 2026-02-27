(function () {
  console.log("Inside the github lead script")
  var cfg = window.LeadBackupConfig || {};
  var CRM_BASE = (cfg.crmBaseUrl || "https://api.homesfy.in/").replace(/\/+$/, "") + "/";
  var SHEET_URL = cfg.googleScriptUrl || "";
  var MANUAL_PROJECT_ID = cfg.projectId ? Number(cfg.projectId) : null;
  var DEFAULT_THANKYOU = cfg.thankYouUrl || "thankyou.html";

  function nowLocal() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function postToSheet(payload) {
    if (!SHEET_URL) return;
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(SHEET_URL, new Blob([body], { type: "application/json" }));
        return;
      }
    } catch (e) {}
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: body
    }).catch(function () {});
  }

  async function postToCrm(leadData) {
    return fetch(CRM_BASE + "api/leads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadData)
    });
  }

  function applyManualProjectId() {
    if (!MANUAL_PROJECT_ID) return;
    if (typeof window.changeProjectId === "function") {
      window.changeProjectId(MANUAL_PROJECT_ID);
    }
  }

  function patchSendLead() {
    if (typeof window.SendLead !== "function") {
      setTimeout(patchSendLead, 250);
      return;
    }

    window.SendLead = async function (leadData, thankyouUrl) {
      applyManualProjectId();

      if (MANUAL_PROJECT_ID) {
        leadData.project_id = MANUAL_PROJECT_ID;
      }

      var targetThankYou = thankyouUrl || DEFAULT_THANKYOU;
      var eventId = Date.now() + "_" + Math.random().toString(36).slice(2, 8);

      var crmStatus = "failed";
      var crmError = "";

      try {
        var crmResp = await postToCrm(leadData);
        if (crmResp.ok) {
          crmStatus = "success";
        } else {
          crmError = "HTTP_" + crmResp.status;
        }
      } catch (err) {
        crmError = String((err && err.message) || err || "CRM_REQUEST_FAILED");
      }

      postToSheet({
        submitted_at: new Date().toISOString(),
        timestamp_local: nowLocal(),
        event_id: eventId,
        page_url: window.location.href,
        page_title: document.title || "",
        referrer: document.referrer || "",
        user_agent: navigator.userAgent || "",
        form_id: leadData.tracking_lead_id || "default_tracking_id",
        crm_status: crmStatus,
        crm_error: crmError,
        lead: leadData
      });

      if (crmStatus === "success") {
        window.location.href = targetThankYou;
        return 1;
      }
      return 0;
    };
  }

  applyManualProjectId();
  patchSendLead();
})();
