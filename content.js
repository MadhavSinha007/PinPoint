(
  function () {

  let currentPath = location.pathname;
  let currentHash = location.hash;
  let bookmarks = [];
  let messageMap = new Map();
  let textToBookmarkMap = new Map();
  let container = null;
  let list = null;
  let collapsed = false;
  let isLoading = false;
  let conversationKey;
  let lastLoadKey = null;

  function getConversationKey() {
    return "ai_bookmarks_" + location.pathname + location.hash;
  }

  conversationKey = getConversationKey();

  init();

  function init() {
    console.log("[BOOKMARKS] Init started");
    console.log("[BOOKMARKS] Current hostname:", location.hostname);
    createUI();
    loadBookmarksAndScan();
    observeMessages();
    watchURLChange();
    setupToggleShortcut();
    
    // Debug: log available message elements
    setTimeout(() => {
      console.log("[BOOKMARKS] ===== SELECTOR DEBUG =====");
      console.log("[BOOKMARKS] Hostname:", location.hostname);
      
      if (location.hostname.includes("chatgpt") || location.hostname.includes("openai")) {
        console.log("[BOOKMARKS] ChatGPT detected");
        const selector1 = document.querySelectorAll("div[data-message-author-role='user']");
        console.log("[BOOKMARKS] Selector 1 found:", selector1.length, "messages");
        
        const selector2 = document.querySelectorAll("[data-message-id]");
        console.log("[BOOKMARKS] All [data-message-id]:", selector2.length);
        
        const selector3 = document.querySelectorAll("[role='article']");
        console.log("[BOOKMARKS] [role='article']:", selector3.length);
        
        const selector4 = document.querySelectorAll("[class*='message']");
        console.log("[BOOKMARKS] [class*='message']:", selector4.length);
      }
      
      if (location.hostname.includes("gemini")) {
        console.log("[BOOKMARKS] Gemini detected");
        const selector1 = document.querySelectorAll("user-query");
        console.log("[BOOKMARKS] <user-query>:", selector1.length);
        
        const selector2 = document.querySelectorAll("[data-user-query]");
        console.log("[BOOKMARKS] [data-user-query]:", selector2.length);
        
        const selector3 = document.querySelectorAll(".query-text");
        console.log("[BOOKMARKS] .query-text:", selector3.length);
        
        const selector4 = document.querySelectorAll("[role='region']");
        console.log("[BOOKMARKS] [role='region']:", selector4.length);
      }
      
      const found = getUserMessages();
      console.log("[BOOKMARKS] getUserMessages() found:", found.length, "messages");
      found.forEach((msg, i) => {
        console.log("[BOOKMARKS] Message", i, ":", msg.innerText?.substring(0, 50) || "(no text)");
      });
    }, 1000);
  }

  function watchURLChange() {
    setInterval(() => {
      const newPath = location.pathname;
      const newHash = location.hash;
      
      if (newPath !== currentPath || newHash !== currentHash) {
        console.log("[BOOKMARKS] URL changed - resetting");
        currentPath = newPath;
        currentHash = newHash;
        resetForNewConversation();
      }
    }, 500);
  }

  function resetForNewConversation() {
    console.log("[BOOKMARKS] Resetting for new conversation");
    isLoading = true;
    conversationKey = getConversationKey();
    bookmarks = [];
    messageMap.clear();
    textToBookmarkMap.clear();
    list.innerHTML = "";
    lastLoadKey = null;
    loadBookmarksAndScan();
  }

  function createUI() {
    if (document.getElementById("ai-query-bookmarks")) return;

    container = document.createElement("div");
    container.id = "ai-query-bookmarks";

    list = document.createElement("div");
    list.id = "bookmark-list";

    container.appendChild(list);
    document.body.appendChild(container);
    console.log("[BOOKMARKS] UI created");
  }

  function saveBookmarks() {
    chrome.storage.local.set({ [conversationKey]: bookmarks });
  }

  function loadBookmarksAndScan() {
    const keyToLoad = conversationKey;
    lastLoadKey = keyToLoad;
    isLoading = true;
    
    chrome.storage.local.get(keyToLoad, (result) => {
      if (lastLoadKey !== keyToLoad) {
        return;
      }

      if (result[keyToLoad]) {
        bookmarks = result[keyToLoad];
        console.log("[BOOKMARKS] Loaded", bookmarks.length, "bookmarks");

        bookmarks.forEach(b => {
          const msg = findMessageByText(b.text);
          if (msg) {
            createBookmarkItem(msg, b.text, b.starred, false);
          }
        });

        sortBookmarksUI();
      } else {
        console.log("[BOOKMARKS] No saved bookmarks for this conversation");
      }

      console.log("[BOOKMARKS] Scanning messages...");
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

  function findMessageByText(text) {
    return getUserMessages().find(
      m => m.innerText?.trim() === text
    );
  }

  function createBookmarkItem(messageElement, text, starred = false, save = true) {
    if (textToBookmarkMap.has(text)) {
      return;
    }

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
    textToBookmarkMap.set(text, item);

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

  function scanMessages() {
    const messages = getUserMessages();
    console.log("[BOOKMARKS] Found", messages.length, "messages");

    messages.forEach(msg => {
      if (messageMap.has(msg)) return;

      const text = msg.innerText?.trim();
      if (!text) return;

      if (!textToBookmarkMap.has(text)) {
        console.log("[BOOKMARKS] Creating bookmark:", text.substring(0, 40) + "...");
        createBookmarkItem(msg, text);
      }
    });
  }
  function observeMessages() {
    let scanTimeout;
    const observer = new MutationObserver(() => {
      if (isLoading) return;
      
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(scanMessages, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function setupToggleShortcut() {
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "b") {
        collapsed = !collapsed;
        container.style.display = collapsed ? "none" : "flex";
      }
    });
  }

})();