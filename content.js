(() => {
  const browserAPI = typeof browser !== "undefined" ? browser : chrome;

  let currentPath = location.pathname;
  let currentHash = location.hash;

  let bookmarks = [];
  let messageMap = new Map();
  let textToBookmarkMap = new Map();

  let container = null;
  let header = null;
  let body = null;
  let searchInput = null;
  let list = null;

  let collapsed = false;
  let isLoading = false;

  let conversationKey = getConversationKey();
  let lastLoadKey = null;

  function getConversationKey() {
    return `ai_bookmarks_${location.hostname}_${location.pathname}_${location.hash}`;
  }

  function init() {
    createUI();
    loadBookmarksAndScan();
    observeMessages();
    watchURLChange();
    setupToggleShortcut();

    console.log("[AI Bookmark Pro] Initialized");
  }

  function watchURLChange() {
    setInterval(() => {
      if (location.pathname !== currentPath || location.hash !== currentHash) {
        currentPath = location.pathname;
        currentHash = location.hash;
        resetForNewConversation();
      }
    }, 500);
  }

  function resetForNewConversation() {
    isLoading = true;

    conversationKey = getConversationKey();
    bookmarks = [];

    messageMap.clear();
    textToBookmarkMap.clear();

    if (list) list.innerHTML = "";
    if (searchInput) searchInput.value = "";

    lastLoadKey = null;
    loadBookmarksAndScan();
  }

  function createUI() {
    const existing = document.getElementById("ai-query-bookmarks");

    if (existing) {
      container = existing;
      header = existing.querySelector("#bookmark-header");
      body = existing.querySelector("#bookmark-body");
      searchInput = existing.querySelector("#bookmark-search");
      list = existing.querySelector("#bookmark-list");
      return;
    }

    container = document.createElement("div");
    container.id = "ai-query-bookmarks";

    header = document.createElement("div");
    header.id = "bookmark-header";

    const title = document.createElement("span");
    title.id = "bookmark-title";
    title.textContent = "Bookmarks";

    const collapseButton = document.createElement("button");
    collapseButton.id = "bookmark-collapse";
    collapseButton.textContent = ">";
    collapseButton.title = "Collapse bookmarks";

    collapseButton.addEventListener("click", () => {
      collapsed = !collapsed;
      updateCollapseState();
    });

    header.appendChild(title);
    header.appendChild(collapseButton);

    body = document.createElement("div");
    body.id = "bookmark-body";

    searchInput = document.createElement("input");
    searchInput.id = "bookmark-search";
    searchInput.type = "text";
    searchInput.placeholder = "Search bookmarks...";

    searchInput.addEventListener("input", filterBookmarks);

    list = document.createElement("div");
    list.id = "bookmark-list";

    body.appendChild(searchInput);
    body.appendChild(list);

    container.appendChild(header);
    container.appendChild(body);

    document.body.appendChild(container);

    updateCollapseState();
  }

  function updateCollapseState() {
    const collapseButton = document.getElementById("bookmark-collapse");

    if (!body || !collapseButton || !container) return;

    container.classList.toggle("collapsed", collapsed);

    if (collapsed) {
      body.setAttribute("aria-hidden", "true");
    } else {
      body.setAttribute("aria-hidden", "false");
    }

    collapseButton.textContent = collapsed ? "<" : ">";
    collapseButton.setAttribute(
      "aria-label",
      collapsed ? "Expand bookmarks" : "Collapse bookmarks"
    );
    collapseButton.title = collapsed ? "Expand bookmarks" : "Collapse bookmarks";
  }

  function saveBookmarks() {
    browserAPI.storage.local.set({
      [conversationKey]: bookmarks
    });
  }

  function loadBookmarksAndScan() {
    const keyToLoad = conversationKey;

    lastLoadKey = keyToLoad;
    isLoading = true;

    browserAPI.storage.local.get(keyToLoad, result => {
      if (lastLoadKey !== keyToLoad) return;

      bookmarks = Array.isArray(result[keyToLoad])
        ? result[keyToLoad]
        : [];

      bookmarks.forEach(bookmark => {
        const msg = findMessageByText(bookmark.text);

        if (msg) {
          createBookmarkItem(
            msg,
            bookmark.text,
            Boolean(bookmark.starred),
            false
          );
        }
      });

      sortBookmarksUI();
      scanMessages();

      isLoading = false;
    });
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
    return element?.innerText?.trim() || "";
  }

  function findMessageByText(text) {
    return getUserMessages().find(msg => getMessageText(msg) === text);
  }

  function createBookmarkItem(messageElement, text, starred = false, save = true) {
    if (!list || !text || textToBookmarkMap.has(text)) return;

    const item = document.createElement("div");
    item.className = "bookmark-card";
    item.dataset.text = text.toLowerCase();

    if (starred) {
      item.classList.add("starred");
    }

    const label = document.createElement("span");
    label.className = "bookmark-label";
    label.textContent = text.length > 80 ? `${text.slice(0, 80)}...` : text;
    label.title = text;

    const star = document.createElement("span");
    star.className = "bookmark-star";
    star.textContent = starred ? "★" : "☆";
    star.title = "Toggle star";

    star.addEventListener("click", event => {
      event.stopPropagation();

      const isStarred = item.classList.toggle("starred");
      star.textContent = isStarred ? "★" : "☆";

      bookmarks = bookmarks.map(bookmark =>
        bookmark.text === text
          ? { ...bookmark, starred: isStarred }
          : bookmark
      );

      sortBookmarksUI();
      filterBookmarks();
      saveBookmarks();
    });

    item.addEventListener("click", () => {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });

    item.appendChild(label);
    item.appendChild(star);

    list.appendChild(item);

    messageMap.set(messageElement, item);
    textToBookmarkMap.set(text, item);

    if (save) {
      bookmarks.push({
        text,
        starred
      });

      saveBookmarks();
    }

    filterBookmarks();
  }

  function filterBookmarks() {
    if (!list || !searchInput) return;

    const query = searchInput.value.trim().toLowerCase();

    Array.from(list.children).forEach(item => {
      const text = item.dataset.text || "";
      item.style.display = text.includes(query) ? "flex" : "none";
    });
  }

  function sortBookmarksUI() {
    if (!list) return;

    const items = Array.from(list.children);

    items.sort((a, b) => {
      const aStarred = a.classList.contains("starred");
      const bStarred = b.classList.contains("starred");

      return Number(bStarred) - Number(aStarred);
    });

    items.forEach(item => list.appendChild(item));
  }

  function scanMessages() {
    const messages = getUserMessages();

    messages.forEach(msg => {
      if (messageMap.has(msg)) return;

      const text = getMessageText(msg);

      if (!text || textToBookmarkMap.has(text)) return;

      createBookmarkItem(msg, text, false, true);
    });
  }

  function observeMessages() {
    let scanTimeout;

    const observer = new MutationObserver(() => {
      if (isLoading) return;

      clearTimeout(scanTimeout);

      scanTimeout = setTimeout(() => {
        scanMessages();
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function setupToggleShortcut() {
    document.addEventListener("keydown", event => {
      if (event.altKey && event.key.toLowerCase() === "b") {
        collapsed = !collapsed;
        updateCollapseState();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();