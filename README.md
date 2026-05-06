# 🎮 Game Hubs

> A collection of 8 classic arcade & puzzle games — packaged as a **Chrome Extension** and a **standalone web app**.

[![Status](https://img.shields.io/badge/status-pending%20review-yellow)]()
[![Manifest](https://img.shields.io/badge/manifest-v3-blue)]()
[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red)]()

---

## ✨ What Is Game Hubs?

Game Hubs is a self-contained collection of **8 timeless games**, all built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies. The whole project weighs in at **~116 KB**.

It's distributed in **two ways**:

1. **🧩 Chrome Extension** — Install from the Chrome Web Store, click the toolbar icon, and a popup lets you launch any game instantly.
2. **🌐 Web App** — Hosted live on GitHub Pages at [elvic-group.github.io/game-hubs](https://elvic-group.github.io/game-hubs/).

---

## 🕹️ The Games

| Game | Type | Players | Features |
|---|---|---|---|
| 🐍 **Snake** | Arcade | Single | 3 difficulty levels |
| ❌ **Tic-Tac-Toe** | Strategy | 1–2 | AI opponent + local 2-player |
| 🏓 **Ping Pong** | Arcade | 1–2 | 3 difficulty levels |
| 🟦 **Tetris** | Puzzle | Single | 3 difficulty levels |
| 🧱 **Breakout** | Arcade | Single | Power-ups |
| 🐦 **Flappy Bird** | Arcade | Single | Endless mode |
| 🔢 **2048** | Puzzle | Single | Classic sliding puzzle |
| 💣 **Minesweeper** | Puzzle | Single | 3 grid sizes |

---

## 🎨 Design

- **Dark retro-modern theme** — `#0a0a1a` background with neon `#e94560` accents
- **Particle background animation** on the homepage
- **Animated game previews** in cards on the launcher
- **Web Audio API** for sound effects (toggle on/off)
- **Mobile-friendly** touch controls
- **localStorage** for high scores (data never leaves the device)

---

## 🛡️ Privacy

Game Hubs is **100% offline-capable** and respects your privacy:

- ❌ No tracking
- ❌ No analytics
- ❌ No cookies
- ❌ No network requests
- ❌ No account or sign-up
- ✅ All scores saved locally

Read the full [Privacy Policy](https://elvic-group.github.io/game-hubs/privacy.html).

---

## 📂 Project Structure

```
game-hubs/
├── index.html              # Main launcher (web)
├── index.js                # Launcher logic & particle bg
├── popup.html              # Chrome extension popup
├── popup.js                # Popup launcher logic
├── manifest.json           # Chrome extension manifest (v3)
├── privacy.html            # Privacy policy
├── terms.html              # Terms & conditions
├── sponsor.html            # Sponsor page
├── icons/                  # Extension icons (16/48/128)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── screenshots/            # Chrome Web Store screenshots (1280×800)
│   ├── 01-home.png
│   ├── 02-snake.png
│   ├── ...
│   └── 09-minesweeper.png
└── <game>/                 # One folder per game
    ├── game.html
    ├── game.js
    └── icons/
```

Each game lives in its **own folder** with `game.html` + `game.js`, fully self-contained.

---

## 🚀 Running Locally

### Option A: Open `index.html` directly
Just double-click `index.html`. Most games will work over `file://`.

### Option B: Local web server (recommended)
Some browsers restrict canvas/`localStorage` over `file://`. Run a simple server:

```sh
# Python 3 (already installed on macOS)
python3 -m http.server 8765

# Or Node.js
npx serve .
```

Then open http://localhost:8765/

### Option C: Install as unpacked Chrome Extension
1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `game-hubs/` folder
5. The Game Hubs icon appears in your toolbar 🎮

---

## 🌍 Live URLs

| Resource | URL |
|---|---|
| **Web app** | https://elvic-group.github.io/game-hubs/ |
| **Privacy policy** | https://elvic-group.github.io/game-hubs/privacy.html |
| **Terms & conditions** | https://elvic-group.github.io/game-hubs/terms.html |
| **Chrome Web Store** *(after approval)* | https://chromewebstore.google.com/detail/fncbpinlpcjmmfkenleanhpgeepkikeh |
| **Source code** | https://github.com/elvic-group/game-hubs |

---

## 💖 Support

If you enjoy Game Hubs, you can support development via [Ko-fi ☕](https://ko-fi.com/elvicgroups).

Want to advertise or sponsor? Email **elvickongolo@gmail.com**.

---

## 👤 Author

**Elvic Groups** — by [Elvic Kongolo](https://github.com/elvic-group)
Built with ❤️ in Sortland, Norway.

---

## 📜 License

© 2026 Elvic Groups. All rights reserved.
