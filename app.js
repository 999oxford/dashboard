(() => {
  // --- Firebase config (replace with your project's keys) ---
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
  };
  let db = null;
  try {
    if (window.firebase && firebase?.apps?.length === 0) {
      firebase.initializeApp(firebaseConfig);
    } else if (window.firebase && firebase?.apps?.length > 0) {
      // already initialized
    }
    if (window.firebase) {
      db = firebase.firestore();
    }
  } catch (e) {
    console.warn("Firebase init skipped or failed (local dev):", e);
  }
  const CHANNELS = [
    "Global",
    "Thames Valley Police",
    "South Central Ambulance Service",
  ];

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
    messageInput: document.getElementById("messageInput"),
    sendBtn: document.getElementById("sendBtn"),
    clearBtn: document.getElementById("clearBtn"),
  };

  let selectedChannel = CHANNELS[0];
  let messagesByChannel = loadMessages();
  let user = loadUser();

  function escapeHTML(input) {
    return input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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
    } catch (_e) {
      return null;
    }
  }

  function saveUser(next) {
    localStorage.setItem("radioUser", JSON.stringify(next));
  }

  function loadMessages() {
    try {
      const raw = localStorage.getItem("radioMessagesV1");
      if (!raw) throw new Error("empty");
      const parsed = JSON.parse(raw);
      const base = { Global: [], "Thames Valley Police": [], "South Central Ambulance Service": [] };
      return { ...base, ...parsed };
    } catch (_e) {
      return { Global: [], "Thames Valley Police": [], "South Central Ambulance Service": [] };
    }
  }

  function saveMessages() {
    localStorage.setItem("radioMessagesV1", JSON.stringify(messagesByChannel));
  }

  function showLoginModal(show) {
    els.loginModal.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) {
      requestAnimationFrame(() => {
        els.serviceSelect.focus();
      });
    }
  }

  function updateHeader() {
    if (user) {
      els.userService.textContent = user.service;
      els.userCallsign.textContent = `[${user.callsign}]`;
    } else {
      els.userService.textContent = "";
      els.userCallsign.textContent = "";
    }
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
      // msg is an object: { prefixText, prefixClass, body }
      if (typeof msg === "string") {
        // Backward compatibility for previous string format
        div.textContent = msg;
      } else {
        const prefixSpan = document.createElement("span");
        prefixSpan.className = `radio-prefix ${msg.prefixClass || ""}`;
        prefixSpan.textContent = msg.prefixText + ":";
        const bodySpan = document.createElement("span");
        bodySpan.textContent = " " + msg.body;
        const ts = document.createElement("span");
        ts.className = "timestamp";
        ts.textContent = msg.timeStr ? msg.timeStr : "";
        div.appendChild(prefixSpan);
        div.appendChild(bodySpan);
        div.appendChild(ts);
      }
      els.radioFeed.appendChild(div);
    }
    els.radioFeed.scrollTop = els.radioFeed.scrollHeight;
  }

  function buildPrefix() {
    if (!user) return { prefixText: "[----]", prefixClass: "" };
    const callsign = String(user.callsign).padStart(4, "0");
    const isTVP = user.service === "Thames Valley Police";
    const prefixText = isTVP ? `[TVP-${callsign}]` : `[SCAS-${callsign}]`;
    const prefixClass = isTVP ? "tvp" : "scas";
    return { prefixText, prefixClass };
  }

  function sendMessage(rawText) {
    if (!user) {
      showLoginModal(true);
      return;
    }
    const text = String(rawText || "").trim();
    if (!text) return;
    const { prefixText, prefixClass } = buildPrefix();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatted = { prefixText, prefixClass, body: text, timeStr, ts: Date.now() };
    const list = messagesByChannel[selectedChannel] || (messagesByChannel[selectedChannel] = []);
    list.push(formatted);
    // Keep last 500 per channel to avoid unbounded growth
    if (list.length > 500) list.splice(0, list.length - 500);
    saveMessages();
    renderFeed();
    if (els.messageInput) els.messageInput.value = "";

    // Broadcast to Firestore
    if (db) {
      try {
        db.collection("radioChannels").doc(selectedChannel).collection("messages").add({
          body: text,
          prefixText,
          prefixClass,
          ts: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.warn("Failed to send to Firestore:", e);
      }
    }
  }

  function handleTabClick(event) {
    const btn = event.currentTarget;
    const ch = btn.dataset.channel;
    if (!CHANNELS.includes(ch)) return;
    selectedChannel = ch;
    renderTabs();
    renderFeed();
  }

  function mountQuickButtons() {
    els.quickGrid.innerHTML = "";
    for (const qm of QUICK_MESSAGES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `quick-btn ${qm.cls || ""}`;
      btn.textContent = qm.text;
      btn.addEventListener("click", () => sendMessage(qm.text));
      els.quickGrid.appendChild(btn);
    }
  }

  function bindEvents() {
    els.tabs.forEach((tab) => tab.addEventListener("click", handleTabClick));
    els.changeIdentityBtn.addEventListener("click", () => showLoginModal(true));
    if (els.clearBtn) {
      els.clearBtn.addEventListener("click", async () => {
        messagesByChannel[selectedChannel] = [];
        saveMessages();
        renderFeed();
        if (db) {
          try {
            // delete recent docs (client-side simple clear)
            const snap = await db.collection("radioChannels").doc(selectedChannel).collection("messages").limit(100).get();
            const batch = db.batch();
            snap.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          } catch (e) {
            console.warn("Failed to clear remote messages:", e);
          }
        }
      });
    }
    if (els.sendBtn) {
      els.sendBtn.addEventListener("click", () => sendMessage(els.messageInput.value));
    }
    if (els.messageInput) {
      els.messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendMessage(els.messageInput.value);
        }
      });
    }

    els.callsignInput.addEventListener("input", () => {
      els.callsignInput.value = els.callsignInput.value.replace(/[^0-9]/g, "").slice(0, 4);
    });

    els.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const service = String(els.serviceSelect.value || "");
      const callsign = String(els.callsignInput.value || "");
      const isValidService = service === "Thames Valley Police" || service === "South Central Ambulance Service";
      const isValidCallsign = /^\d{4}$/.test(callsign);
      if (!isValidService || !isValidCallsign) {
        els.callsignInput.reportValidity();
        return;
      }
      user = { service, callsign };
      saveUser(user);
      updateHeader();
      showLoginModal(false);
    });

    // Dismiss modal with ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.loginModal.getAttribute("aria-hidden") === "false") {
        showLoginModal(false);
      }
    });
  }

  // Init
  bindEvents();
  mountQuickButtons();
  renderTabs();
  renderFeed();
  // Real-time subscription
  if (db) {
    CHANNELS.forEach((ch) => {
      db.collection("radioChannels").doc(ch).collection("messages").orderBy("ts", "asc").onSnapshot((snap) => {
        const list = messagesByChannel[ch] || (messagesByChannel[ch] = []);
        let changed = false;
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const d = change.doc.data();
            const date = d.ts && d.ts.toDate ? d.ts.toDate() : new Date();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const entry = { prefixText: d.prefixText, prefixClass: d.prefixClass, body: d.body, timeStr, ts: (date.getTime ? date.getTime() : Date.now()) };
            // prevent duplicates: if same ts+body+prefix exists, skip
            const key = entry.prefixText + '|' + entry.body + '|' + entry.ts;
            const exists = list.some((x) => (x.prefixText + '|' + x.body + '|' + x.ts) === key);
            if (!exists) {
              list.push(entry);
              changed = true;
            }
          }
        });
        if (changed) {
          // Clamp list size
          if (list.length > 500) list.splice(0, list.length - 500);
          saveMessages();
          if (selectedChannel === ch) renderFeed();
        }
      });
    });
  }
  if (!user) {
    showLoginModal(true);
  } else {
    updateHeader();
  }
})();

