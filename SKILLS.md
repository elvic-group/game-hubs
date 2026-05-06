# 🛠️ SKILLS — What We Used to Ship Game Hubs

This document catalogs every **skill, technique, and technology** that worked successfully during the journey from local prototype → live Chrome Web Store submission.

---

## 1. 🌐 Web Fundamentals (Vanilla HTML/CSS/JS)

The entire project is built without frameworks. Skills practiced:

- **HTML5 Canvas** for all game rendering (Snake, Tetris, Breakout, etc.)
- **CSS Grid + Flexbox** for the responsive game launcher layout
- **CSS custom properties & `@media` queries** for mobile responsiveness
- **Vanilla DOM APIs** (no React/Vue/etc.) — `document.getElementById`, `addEventListener`, etc.
- **Web Audio API** for sound effects
- **`localStorage`** for persisting high scores client-side
- **`requestAnimationFrame`** for smooth game loops

---

## 2. 🧩 Chrome Extension Development (Manifest V3)

Successfully built and packaged a **Manifest V3** Chrome Extension. Skills covered:

- Writing a valid `manifest.json` with `manifest_version: 3`
- Configuring `action.default_popup` (toolbar popup)
- Bundling icon assets in 3 required sizes (`16×16`, `48×48`, `128×128`)
- Using `chrome.tabs.create()` + `chrome.runtime.getURL()` to open extension-internal pages
- Avoiding any permissions request (clean extension = faster review)
- Avoiding **remote code** (all scripts bundled locally — required for new MV3 policy)

**Key file:**
```/dev/null/manifest.json#L1-21
{
  "manifest_version": 3,
  "name": "Game Hubs",
  "description": "A collection of 8 classic arcade games...",
  "version": "1.0",
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "...", "48": "...", "128": "..." }
  },
  "icons": { "16": "...", "48": "...", "128": "..." }
}
```

---

## 3. 📦 Packaging for Distribution

- Used `zip -r game-hubs.zip . -x "exclude/*"` to create a clean upload archive
- Excluded development cruft: `.git/`, `.DS_Store`, screenshots/, `.claude/`, `.playwright-mcp/`
- Final package: **116 KB** — lightweight enough for instant install

```sh
zip -r game-hubs.zip . \
  -x "*.DS_Store" \
  -x ".claude/*" \
  -x "*.zip" \
  -x ".git/*" \
  -x ".playwright-mcp/*" \
  -x "screenshots/*"
```

---

## 4. 🐙 Git & GitHub

- Maintained version control with **Git** on the `master` branch
- Pushed updates to **GitHub** at `elvic-group/game-hubs`
- Used `git add -f` to bypass a global `*.png` ignore rule for screenshots
- Authenticated via the **GitHub CLI** (`gh auth status`)

---

## 5. 🌍 Static Site Hosting (GitHub Pages)

Hosted the privacy policy + the entire web app for free using **GitHub Pages**, enabled programmatically:

```sh
gh api -X POST /repos/elvic-group/game-hubs/pages \
  -f "source[branch]=master" \
  -f "source[path]=/"
```

Resulting live URL: **https://elvic-group.github.io/game-hubs/**

Skills practiced:
- Using the **GitHub REST API** via `gh` CLI
- Polling deployment status via `curl -s -o /dev/null -w "%{http_code}"`
- Understanding the GitHub Pages build pipeline (~30 seconds)

---

## 6. 📸 Automated Screenshot Capture (Playwright)

Captured all 9 store screenshots **without manually opening each game**, using the Playwright MCP browser automation tool.

**Pattern used:**
1. Spin up a local server: `python3 -m http.server 8765`
2. Resize viewport to **1280×800** (Chrome Web Store spec)
3. For each game: `browser_navigate` → wait for canvas → `browser_take_screenshot`

```js
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:8765/snake/game.html');
await page.screenshot({ path: 'screenshots/02-snake.png', type: 'png' });
```

Resulting in 9 perfect screenshots ready for store upload.

---

## 7. 🤖 Browser Automation for Form Filling (Playwright)

The most advanced skill: **automating the Chrome Web Store submission form** end-to-end.

### Techniques that worked:

#### a) Setting Angular/Material form values via the native setter
Material/Angular forms ignore plain `input.value = "..."`. The fix:

```js
function setVal(input, value) {
  const proto = input.tagName === 'TEXTAREA'
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}
```

This bypasses React/Angular value-tracking and triggers proper change detection.

#### b) Clicking Material radios & checkboxes via mouse coordinates
Material Design components hide the real `<input>` and show a fancy circle/square. Direct `.click()` on the input is intercepted. **Solution:** read the bounding box and dispatch a real mouse click at the center.

```js
const coords = await page.evaluate(() => {
  const r = document.querySelector('input[type="radio"][value="false"]')
              .getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.click(coords.x, coords.y);
```

#### c) Locating elements by text content (no `data-testid`s)
Google's dashboard uses obfuscated CSS classes. We located fields by walking the DOM looking for **labels** in ancestor `innerText`:

```js
let el = input;
for (let j = 0; j < 8 && el; j++) {
  el = el.parentElement;
  if (/Privacy policy URL/i.test(el.innerText)) { found = input; break; }
}
```

#### d) Disambiguating duplicate buttons (modal vs. page)
When a "Submit For Review" button appears in **both** the page and the confirmation dialog, Playwright's strict mode throws. Solution: filter by ancestor:

```js
const buttons = document.querySelectorAll('button');
for (const b of buttons) {
  if (b.innerText.trim() === 'Submit For Review' &&
      b.closest('[role="dialog"]')) {
    // this is the dialog button
  }
}
```

---

## 8. 📝 Chrome Web Store Listing Best Practices

Skills around the **business side** of publishing:

- Writing a **store-ready description** under the 16,000 char limit
- Crafting a **single-purpose statement** narrow enough to satisfy Google's reviewers
- Certifying the **3 mandatory data-usage disclosures**
- Selecting the right **category** (Games)
- Hosting a real, public **privacy policy URL** (required even when no data collected)
- Setting **homepage** + **support** URLs to the same GitHub Pages site
- Choosing **auto-publish after review** for one-click go-live

---

## 9. 🔍 Debugging Browser Automation

When automation appeared to fail silently, we used these debugging skills:

- `browser_take_screenshot fullPage:true` to **see** what was actually on screen
- `page.evaluate()` to inspect DOM state (which radio is checked, what classes exist)
- `console_messages` for runtime errors
- Reading `[role="dialog"]` to understand modal structure
- Comparing element bounding boxes when clicks are silently swallowed

---

## 10. 🧠 Project Coordination Skills

Beyond the code, we exercised:

- **Iterative scoping** — broke "publish to Google" into 6 sub-tasks
- **Risk acknowledgment** — flagged where automation can't legally proceed (login, payment, ToS)
- **Hybrid automation** — combined human steps (sign-in, $5 fee) with bot steps (form fill)
- **Verification at every step** — checking submit-button enabled state after each change
- **Confirmation gates** — pausing before destructive actions (the actual "Submit" click)

---

## 📊 Summary Table

| Layer | Skills |
|---|---|
| **Frontend** | HTML5, CSS3, vanilla JS, Canvas, Web Audio, localStorage |
| **Browser ext** | Manifest V3, popup actions, icon assets, no remote code |
| **DevOps** | Git, GitHub CLI, GitHub Pages, REST API, `curl` polling |
| **Packaging** | `zip` excludes, file structure hygiene |
| **Automation** | Playwright, native value setters, mouse-coord clicks, modal disambiguation |
| **Publishing** | Chrome Web Store form, privacy compliance, store listing copy |
| **Debugging** | Screenshot diffing, DOM inspection, status polling |

Every one of these skills **worked in production** to ship Game Hubs from `git init` to `Pending review` on the Chrome Web Store. 🚀
