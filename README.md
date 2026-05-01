# 🚀 AI Bookmark Pro

A lightweight browser extension that lets you **bookmark, search, star, and navigate AI chat prompts** across platforms like ChatGPT, Gemini, and Claude.

---

## ✨ Features

- 📌 Auto-bookmarks your prompts  
- 🔍 Search through bookmarks instantly  
- ⭐ Star important queries  
- ⚡ Click to scroll to messages  
- 🧠 Per-conversation storage  
- 🧲 Collapsible sidebar (arrow toggle)  
- ⌨️ Shortcut: `Alt + B`  

---

## 🌐 Supported Browsers

### Chromium-based (use Chrome manifest)
- Google Chrome
- Microsoft Edge
- Brave
- Opera
- Vivaldi
- Arc

### Firefox-based (use Firefox manifest)
- Mozilla Firefox
- LibreWolf
- Waterfox

---

## 📁 Project Structure

```
AI-Bookmark-Pro/
│
├── manifest.chrome.json
├── manifest.firefox.json
│
├── background.js
├── content.js
├── sidebar.css
│
└── icons/
```

---

## ⚙️ Installation

### Chrome / Edge / Brave / Opera

1. Rename:
```
manifest.chrome.json → manifest.json
```

2. Open:
```
chrome://extensions
```

3. Enable **Developer Mode**

4. Click **Load Unpacked**

5. Select project folder

---

### Firefox

1. Rename:
```
manifest.firefox.json → manifest.json
```

2. Open:
```
about:debugging#/runtime/this-firefox
```

3. Click **Load Temporary Add-on**

4. Select `manifest.json`

---

## 🎮 Usage

- Click bookmark → scroll to message  
- Click ⭐ → mark important  
- Use 🔍 search bar → filter bookmarks  
- Click arrow `>` / `<` → collapse sidebar  
- Press `Alt + B` → toggle panel  

---

## 🧠 How It Works

- Detects user messages in AI chats  
- Creates bookmarks automatically  
- Stores them locally per conversation  
- Updates in real-time using MutationObserver  

---

## ⚠️ Notes

- Firefox support uses Manifest V2 (temporary workaround)  
- Sidebar is transparent and overlays UI  
- Selectors may need updates if sites change  

---

## 📄 License

MIT