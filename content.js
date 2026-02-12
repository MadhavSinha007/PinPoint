

(
  function () {

  let currentPath = location.pathname;
  let conversationKey = getConversationKey();
  let bookmarks = [];
  let messageMap = new Map();
  let container = null;
  let list = null;
  let collapsed = false;

  init();

  /* ---------------- INIT ---------------- */

  function init() {
    createUI();
    loadBookmarks();
    scanMessages();
    observeMessages();
    watchURLChange();
    setupToggleShortcut();
  }

  /* ---------------- URL CHANGE DETECTION ---------------- */

  function watchURLChange() {
    const observer = new MutationObserver(() => {
      if (location.pathname !== currentPath) {
        currentPath = location.pathname;
        resetForNewConversation();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function resetForNewConversation() {
    conversationKey = getConversationKey();
    bookmarks = [];
    messageMap.clear();
    list.innerHTML = "";
    loadBookmarks();
    scanMessages();
  }

  function getConversationKey() {
    return "ai_bookmarks_" + location.pathname;
  }

  /* ---------------- UI ---------------- */

  function createUI() {
    if (document.getElementById("ai-query-bookmarks")) return;

    container = document.createElement("div");
    container.id = "ai-query-bookmarks";

    list = document.createElement("div");
    list.id = "bookmark-list";

    container.appendChild(list);
    document.body.appendChild(container);
  }

  /* ---------------- STORAGE ---------------- */

  function saveBookmarks() {
    chrome.storage.local.set({ [conversationKey]: bookmarks });
  }

  function loadBookmarks() {
    chrome.storage.local.get(conversationKey, (result) => {
      if (result[conversationKey]) {
        bookmarks = result[conversationKey];

        bookmarks.forEach(b => {
          const msg = findMessageByText(b.text);
          if (msg) createBookmarkItem(msg, b.text, b.starred, false);
        });

        sortBookmarksUI();
      }
    });
  }

  /* ---------------- MESSAGE DETECTION ---------------- */

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

  function findMessageByText(text) {
    return getUserMessages().find(
      m => m.innerText?.trim() === text
    );
  }

  /* ---------------- BOOKMARK UI ---------------- */

  function createBookmarkItem(messageElement, text, starred = false, save = true) {

    const item = document.createElement("div");
    item.className = "bookmark-card";
    if (starred) item.classList.add("starred");

    const label = document.createElement("span");
    label.className = "bookmark-label";
    label.textContent =
      text.length > 80 ? text.substring(0, 80) + "..." : text;

    const star = document.createElement("span");
    star.className = "bookmark-star";
    star.textContent = starred ? "★" : "☆";

    star.onclick = (e) => {
      e.stopPropagation();

      const isStarred = item.classList.toggle("starred");
      star.textContent = isStarred ? "★" : "☆";

      bookmarks = bookmarks.map(b =>
        b.text === text ? { ...b, starred: isStarred } : b
      );

      sortBookmarksUI();
      saveBookmarks();
    };

    item.appendChild(label);
    item.appendChild(star);

    item.onclick = () => {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    };

    list.appendChild(item);
    messageMap.set(messageElement, item);

    if (save) {
      bookmarks.push({ text, starred: false });
      saveBookmarks();
    }
  }

  function sortBookmarksUI() {
    const items = Array.from(list.children);

    items.sort((a, b) => {
      const aStar = a.classList.contains("starred");
      const bStar = b.classList.contains("starred");
      return bStar - aStar;
    });

    items.forEach(item => list.appendChild(item));
  }

  /* ---------------- SCANNING ---------------- */

  function scanMessages() {
    const messages = getUserMessages();

    messages.forEach(msg => {
      if (messageMap.has(msg)) return;

      const text = msg.innerText?.trim();
      if (!text) return;

      createBookmarkItem(msg, text);
    });
  }

  function observeMessages() {
    const observer = new MutationObserver(scanMessages);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* ---------------- SHORTCUT ---------------- */

  function setupToggleShortcut() {
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "b") {
        collapsed = !collapsed;
        container.style.display = collapsed ? "none" : "flex";
      }
    });
  }

})();
