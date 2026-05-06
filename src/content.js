(() => {
  "use strict";

  if (window.__CHATTRAIL_INIT__) return;
  window.__CHATTRAIL_INIT__ = true;

  const browserAPI =
    typeof browser !== "undefined"
      ? browser
      : typeof chrome !== "undefined"
        ? chrome
        : null;

  if (!browserAPI?.storage?.local) {
    console.warn("[ChatTrail] Storage API unavailable");
    return;
  }

  const ROOT_ID = "chattrail-sidebar";
  const NAV_EVENT = "chattrail-navigation";

  let bookmarks = [];
  let textToElementMap = new Map();
  let knownTexts = new Set();

  let container = null;
  let body = null;
  let searchInput = null;
  let list = null;
  let collapsed = false;

  let conversationKey = getConversationKey();
  let currentURL = location.href;

  let observer = null;
  let scanTimer = null;
  let saveTimer = null;
  let navigationTimer = null;

  let isNavigating = false;
  let isLoading = false;

  function getConversationKey() {
    return `chattrail_${location.hostname}_${location.pathname}_${location.hash}`;
  }

  function init() {
    createUI();
    patchNavigation();
    bindNavigationEvents();
    setupToggleShortcut();
    observeMessages();
    loadCurrentChat();

    console.log("[ChatTrail] Initialized");
  }

  function createUI() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) existing.remove();

    container = document.createElement("div");
    container.id = ROOT_ID;

    const header = document.createElement("div");
    header.id = "bookmark-header";

    const title = document.createElement("span");
    title.id = "bookmark-title";
    title.textContent = "ChatTrail";

    const collapseButton = document.createElement("button");
    collapseButton.id = "bookmark-collapse";
    collapseButton.type = "button";
    collapseButton.textContent = ">";

    collapseButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      collapsed = !collapsed;
      updateCollapseState();
    });

    header.append(title, collapseButton);

    body = document.createElement("div");
    body.id = "bookmark-body";

    searchInput = document.createElement("input");
    searchInput.id = "bookmark-search";
    searchInput.type = "search";
    searchInput.placeholder = "Search ChatTrail...";
    searchInput.autocomplete = "off";

    searchInput.addEventListener("input", filterBookmarks);

    list = document.createElement("div");
    list.id = "bookmark-list";

    body.append(searchInput, list);
    container.append(header, body);
    document.body.appendChild(container);

    updateCollapseState();
  }

  function updateCollapseState() {
    const collapseButton = document.getElementById("bookmark-collapse");
    if (!container || !body || !collapseButton) return;

    container.classList.toggle("collapsed", collapsed);
    body.setAttribute("aria-hidden", collapsed ? "true" : "false");

    collapseButton.textContent = collapsed ? "<" : ">";
    collapseButton.title = collapsed ? "Expand ChatTrail" : "Collapse ChatTrail";
    collapseButton.setAttribute("aria-label", collapseButton.title);
  }

  function patchNavigation() {
    if (window.__CHATTRAIL_NAV_PATCHED__) return;
    window.__CHATTRAIL_NAV_PATCHED__ = true;

    ["pushState", "replaceState"].forEach(method => {
      const original = history[method];

      history[method] = function (...args) {
        const result = original.apply(this, args);
        window.dispatchEvent(new Event(NAV_EVENT));
        return result;
      };
    });
  }

  function bindNavigationEvents() {
    const handleNavigation = () => {
      if (location.href === currentURL) return;

      currentURL = location.href;
      startChatSwitch();
    };

    window.addEventListener(NAV_EVENT, handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("hashchange", handleNavigation);

    document.addEventListener(
      "click",
      () => {
        setTimeout(handleNavigation, 80);
        setTimeout(handleNavigation, 300);
        setTimeout(handleNavigation, 800);
      },
      true
    );
  }

  function startChatSwitch() {
    isNavigating = true;
    isLoading = true;

    clearTimeout(scanTimer);
    clearTimeout(saveTimer);
    clearTimeout(navigationTimer);

    conversationKey = getConversationKey();
    bookmarks = [];
    textToElementMap.clear();
    knownTexts.clear();

    if (list) list.innerHTML = "";
    if (searchInput) searchInput.value = "";

    navigationTimer = setTimeout(loadCurrentChat, 700);
  }

  function loadCurrentChat() {
    const key = getConversationKey();

    conversationKey = key;
    isLoading = true;

    browserAPI.storage.local.get(key, result => {
      if (key !== getConversationKey()) return;

      bookmarks = Array.isArray(result[key]) ? result[key] : [];

      textToElementMap.clear();
      knownTexts.clear();

      bookmarks.forEach(bookmark => {
        if (bookmark?.text) knownTexts.add(bookmark.text);
      });

      renderBookmarks();

      isLoading = false;
      isNavigating = false;

      retryScanForNewChat();
    });
  }

  function retryScanForNewChat() {
    let attempts = 0;

    const run = () => {
      if (getConversationKey() !== conversationKey) return;

      attempts += 1;
      scanMessages();

      if (attempts < 10) {
        setTimeout(run, 500);
      }
    };

    setTimeout(run, 300);
  }

  function getUserMessages() {
    const host = location.hostname;

    if (host.includes("chatgpt") || host.includes("openai")) {
      return Array.from(
        document.querySelectorAll("div[data-message-author-role='user']")
      );
    }

    if (host.includes("claude")) {
      return Array.from(
        document.querySelectorAll("[data-testid='user-message'], .font-user-message")
      );
    }

    if (host.includes("gemini")) {
      return Array.from(
        document.querySelectorAll("user-query, .query-text, [data-user-query]")
      );
    }

    return [];
  }

  function getMessageText(element) {
    return (element?.innerText || element?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scanMessages() {
    if (isLoading || isNavigating) return;
    if (getConversationKey() !== conversationKey) return;

    const messages = getUserMessages();
    let changed = false;

    messages.forEach(message => {
      const text = getMessageText(message);
      if (!text) return;

      textToElementMap.set(text, message);

      if (knownTexts.has(text)) return;

      knownTexts.add(text);

      bookmarks.push({
        text,
        starred: false
      });

      changed = true;
    });

    if (changed) {
      renderBookmarks();
      saveBookmarks();
    } else {
      filterBookmarks();
    }
  }

  function saveBookmarks() {
    if (isLoading || isNavigating) return;

    const key = conversationKey;
    const data = [...bookmarks];

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
      if (key !== getConversationKey()) return;

      browserAPI.storage.local.set({
        [key]: data
      });
    }, 250);
  }

  function renderBookmarks() {
    if (!list) return;

    list.innerHTML = "";

    const sorted = [...bookmarks].sort((a, b) => {
      return Number(Boolean(b.starred)) - Number(Boolean(a.starred));
    });

    sorted.forEach(bookmark => {
      if (!bookmark?.text) return;

      const item = document.createElement("div");
      item.className = "bookmark-card";
      item.dataset.text = bookmark.text.toLowerCase();

      if (bookmark.starred) item.classList.add("starred");

      const label = document.createElement("span");
      label.className = "bookmark-label";
      label.textContent =
        bookmark.text.length > 80
          ? `${bookmark.text.slice(0, 80)}...`
          : bookmark.text;
      label.title = bookmark.text;

      const star = document.createElement("span");
      star.className = "bookmark-star";
      star.textContent = bookmark.starred ? "★" : "☆";
      star.title = "Toggle star";

      star.addEventListener("click", event => {
        event.stopPropagation();

        bookmark.starred = !bookmark.starred;
        renderBookmarks();
        saveBookmarks();
      });

      item.addEventListener("click", () => {
        scrollToBookmark(bookmark.text);
      });

      item.append(label, star);
      list.appendChild(item);
    });

    filterBookmarks();
  }

  function scrollToBookmark(text) {
    let message = textToElementMap.get(text);

    if (!message || !document.body.contains(message)) {
      message = findMessageByText(text);
    }

    if (!message) {
      retryScanForNewChat();
      return;
    }

    textToElementMap.set(text, message);

    message.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function findMessageByText(text) {
    return getUserMessages().find(message => getMessageText(message) === text);
  }

  function filterBookmarks() {
    if (!list || !searchInput) return;

    const query = searchInput.value.trim().toLowerCase();

    Array.from(list.children).forEach(item => {
      item.style.display = item.dataset.text.includes(query) ? "flex" : "none";
    });
  }

  function observeMessages() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (location.href !== currentURL) {
        currentURL = location.href;
        startChatSwitch();
        return;
      }

      clearTimeout(scanTimer);
      scanTimer = setTimeout(scanMessages, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function setupToggleShortcut() {
    document.addEventListener("keydown", event => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "b") return;
      if (isTyping(event.target)) return;

      event.preventDefault();

      collapsed = !collapsed;
      updateCollapseState();
    });
  }

  function isTyping(target) {
    return Boolean(
      target?.closest?.("input, textarea, select, [contenteditable='true'], [role='textbox']")
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();