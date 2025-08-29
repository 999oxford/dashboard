(() => {
  const CHANNELS = ["Global","Thames Valley Police","South Central Ambulance Service"];
  const QUICK_MESSAGES = [
    { key: "0", text: "State 0 - Panic, emergency assistance.", cls: "danger" },
    { key: "1", text: "State 1 - On duty.", cls: "primary" },
    { key: "2", text: "State 2 - On patrol.", cls: "primary" },
    { key: "3", text: "State 3 - At station (available).", cls: "success" },
    { key: "4", text: "State 4 - On break.", cls: "warning" },
    { key: "5", text: "State 5 - Enroute.", cls: "primary" },
    { key: "6", text: "State 6 - At scene.", cls: "success" },
    { key: "7", text: "State 7 - Committed, deployable.", cls: "primary" },
    { key: "8", text: "State 8 - Committed, not deployable.", cls: "warning" },
    { key: "9", text: "State 9 - Transporting.", cls: "primary" },
    { key: "11", text: "State 11 - Off duty.", cls: "warning" },
  ];
  const els = {
    userService: document.getElementById("userService"),
    userCallsign: document.getElementById("userCallsign"),
    changeIdentityBtn: document.getElementById("changeIdentityBtn"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    radioFeed: document.getElementById("radioFeed"),
    quickGrid: document.getElementById("quickGrid"),
    loginModal: document.getElementById("loginModal"),
    loginForm: document.getElementById("loginForm"),
    serviceSelect: document.getElementById("serviceSelect"),
    callsignInput: document.getElementById("callsignInput"),
  };
  let selectedChannel = CHANNELS[0];
  let messagesByChannel = loadMessages();
  let user = loadUser();
  function escapeHTML(input) {
    return input.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  }
  function loadUser() {
    try {
      const raw = localStorage.getItem("radioUser");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const isValidService = parsed.service === "Thames Valley Police" || parsed.service === "South Central Ambulance Service";
      if (!isValidService) return null;
      if (!/^\d{4}$/.test(String(parsed.callsign || ""))) return null;
      return { service: parsed.service, callsign: String(parsed.callsign) };
    } catch { return null; }
  }
  function saveUser(next) { localStorage.setItem("radioUser", JSON.stringify(next)); }
  function loadMessages() {
    try {
      const raw = localStorage.getItem("radioMessagesV1");
      if (!raw) throw new Error("empty");
      const parsed = JSON.parse(raw);
      const base = { Global: [], "Thames Valley Police": [], "South Central Ambulance Service": [] };
      return { ...base, ...parsed };
    } catch { return { Global: [], "Thames Valley Police": [], "South Central Ambululence Service": [] }; }
  }
  function saveMessages() { localStorage.setItem("radioMessagesV1", JSON.stringify(messagesByChannel)); }
  function showLoginModal(show) {
    els.loginModal.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) requestAnimationFrame(() => els.serviceSelect.focus());
  }
  function updateHeader() {
    if (user) { els.userService.textContent = user.service; els.userCallsign.textContent = `[${user.callsign}]`; }
    else { els.userService.textContent = ""; els.userCallsign.textContent = ""; }
  }
  function renderTabs() {
    els.tabs.forEach((tab) => {
      const isActive = tab.dataset.channel === selectedChannel;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }
  function renderFeed() {
    const list = messagesByChannel[selectedChannel] || [];
    els.radioFeed.innerHTML = "";
    for (const msg of list) {
      const div = document.createElement("div");
      div.className = "radio-line";
      div.innerHTML = escapeHTML(msg);
      els.radioFeed.appendChild(div);
    }
    els.radioFeed.scrollTop = els.radioFeed.scrollHeight;
  }
  function sendMessage(rawText) {
    if (!user) { showLoginModal(true); return; }
    const callsign = String(user.callsign).padStart(4, "0");
    const formatted = `[${callsign}]: (${rawText})`;
    const list = messagesByChannel[selectedChannel] || (messagesByChannel[selectedChannel] = []);
    list.push(formatted);
    if (list.length > 500) list.splice(0, list.length - 500);
    saveMessages(); renderFeed();
  }
  function handleTabClick(event) {
    const ch = event.currentTarget.dataset.channel;
    selectedChannel = ch; renderTabs(); renderFeed();
  }
  function mountQuickButtons() {
    els.quickGrid.innerHTML = "";
    for (const qm of QUICK_MESSAGES) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = `quick-btn ${qm.cls || ""}`; btn.textContent = qm.text;
      btn.addEventListener("click", () => sendMessage(qm.text));
      els.quickGrid.appendChild(btn);
    }
  }
  function bindEvents() {
    els.tabs.forEach((tab) => tab.addEventListener("click", handleTabClick));
    els.changeIdentityBtn.addEventListener("click", () => showLoginModal(true));
    els.callsignInput.addEventListener("input", () => { els.callsignInput.value = els.callsignInput.value.replace(/[^0-9]/g, "").slice(0, 4); });
    els.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const service = String(els.serviceSelect.value || "");
      const callsign = String(els.callsignInput.value || "");
      const isValidService = service === "Thames Valley Police" || service === "South Central Ambulance Service";
      const isValidCallsign = /^\d{4}$/.test(callsign);
      if (!isValidService || !isValidCallsign) { els.callsignInput.reportValidity(); return; }
      user = { service, callsign }; saveUser(user); updateHeader(); showLoginModal(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && els.loginModal.getAttribute("aria-hidden") === "false") showLoginModal(false); });
  }
  bindEvents(); mountQuickButtons(); renderTabs(); renderFeed();
  if (!user) showLoginModal(true); else updateHeader();
})();
