# ChatTrail

A lightweight browser extension that lets you bookmark, search, star, and navigate AI chat prompts across platforms like ChatGPT, Gemini, and Claude without disrupting your workflow.

---

## Features

- Auto-bookmarks your prompts in real-time  
- Instant search through all bookmarks  
- Star important queries for quick access  
- Click to scroll directly to messages  
- Per-conversation memory (auto-saved locally)  
- Minimal, transparent UI (non-intrusive)  
- Smooth collapsible sidebar ( > / < )  
- Keyboard shortcut: Alt + B  

---

## Design Philosophy

- Lightweight and fast  
- Non-distracting UI (transparent + floating)  
- Built for long AI conversations  
- Zero manual setup — works automatically  

---

## Supported Browsers

### Chromium-based
- Google Chrome  
- Microsoft Edge  
- Brave  
- Opera  
- Vivaldi  
- Arc  

### Firefox-based
- Mozilla Firefox  
- LibreWolf  
- Waterfox  

---

## Project Structure

```txt
ChatTrail/
├── build.js
├── manifests/
│   ├── chrome.json
│   └── firefox.json
│
├── src/
│   ├── content.js
│   ├── sidebar.css
│   └── icons/
│
├── dist/
│   ├── chrome/
│   └── firefox/
│
├── README.md
└── PRIVACY_POLICY.md