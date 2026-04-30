# 🚀 AI Bookmark Pro

A lightweight browser extension that lets you **bookmark, star, and instantly navigate your AI chat prompts** across platforms like:

- ChatGPT
- Gemini
- Claude

Works on both **Chrome** and **Firefox** with Manifest V3.

---

## ✨ Features

- 📌 Auto-bookmarks your prompts in real-time  
- ⭐ Star important queries  
- ⚡ Instant scroll to any message  
- 🧠 Per-conversation storage  
- ⌨️ Toggle sidebar with `Alt + B`  
- 🌐 Works across multiple AI platforms  

---

## 🧩 Supported Sites

- https://chatgpt.com  
- https://chat.openai.com  
- https://gemini.google.com  
- https://claude.ai  

---

## 📦 Installation

### 🔵 Chrome / Chromium (Edge, Brave, etc.)

1. Download or clone this repo:
   ```bash
   git clone https://github.com/your-username/ai-bookmark-pro.git
   ```

2. Open Chrome and go to:
   chrome://extensions/

3. Enable **Developer mode** (top right)

4. Click **Load unpacked**

5. Select the project folder

---

### 🟠 Firefox

#### Option 1: Temporary install

1. Go to:
   about:debugging#/runtime/this-firefox

2. Click **Load Temporary Add-on**

3. Select `manifest.json`

---

#### Option 2: Permanent install

1. Zip the extension:
   ```bash
   zip -r ai-bookmark-pro.zip .
   ```

2. Go to:
   about:addons

3. Install from file

---

## ⚙️ How It Works

- Scans AI chat pages for user messages  
- Creates bookmarks automatically  
- Stores them per conversation  

---

## 🎮 Usage

- Click bookmark → scroll to message  
- Click ⭐ → toggle important  
- Press **Alt + B** → toggle sidebar  

---

## 🛠 Tech Stack

- Manifest V3  
- Vanilla JavaScript  
- MutationObserver  
- Chrome Storage API  

---

## 📄 License

MIT
