# 📖 INSTRUCTIONS — How to Publish a Chrome Extension to the Web Store

> A step-by-step replay of the exact workflow used to ship **Game Hubs** to the Chrome Web Store. Every step here **worked in practice**.

This guide assumes you start with a finished, working Chrome extension (HTML/JS/CSS + `manifest.json` + icons) and want to publish it to the Chrome Web Store with a public privacy policy hosted for free.

---

## ✅ Prerequisites

Before starting, make sure you have:

- [x] A finished Chrome extension folder with a valid `manifest.json` (Manifest V3)
- [x] Icons in `16×16`, `48×48`, and `128×128` PNG format
- [x] A GitHub account with the **GitHub CLI** (`gh`) installed and authenticated
- [x] A Google account
- [x] **$5 USD** for the one-time Chrome Web Store developer fee (only the first time)
- [x] A privacy policy HTML page in your project (e.g., `privacy.html`)

Verify GitHub CLI authentication:
```sh
gh auth status
# Should show: ✓ Logged in to github.com account <username>
```

---

## 🗂️ Step 1: Sanity-Check Your Manifest

Open `manifest.json` and confirm the **description matches what your extension actually does**.

```/dev/null/manifest.json#L1-12
{
  "manifest_version": 3,
  "name": "Your Extension Name",
  "description": "An accurate one-line description of all features.",
  "version": "1.0",
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

**Tip:** If your description is outdated, fix it now — Google's reviewers compare description vs. actual functionality.

---

## 📦 Step 2: Create the Submission ZIP

The Chrome Web Store accepts a `.zip` file containing your extension (no parent folder).

From your project root:

```sh
zip -r my-extension.zip . \
  -x "*.DS_Store" \
  -x ".git/*" \
  -x "*.zip" \
  -x "screenshots/*" \
  -x ".claude/*" \
  -x ".playwright-mcp/*"
```

Verify the contents look right:
```sh
unzip -l my-extension.zip | head -20
```

You should see `manifest.json` at the **root** of the zip (not nested in a folder).

**Final size for Game Hubs:** ~116 KB.

---

## 🌍 Step 3: Host Your Privacy Policy on GitHub Pages

The Chrome Web Store **requires a publicly hosted Privacy Policy URL** (yes, even if your extension collects no data).

The fastest free option is GitHub Pages.

### 3a. Push your project to GitHub
```sh
git add .
git commit -m "Prepare for Chrome Web Store submission"
git push origin master
```

### 3b. Enable GitHub Pages via the API
```sh
gh api -X POST /repos/<your-username>/<your-repo>/pages \
  -f "source[branch]=master" \
  -f "source[path]=/"
```

You'll get back JSON with `"html_url": "https://<username>.github.io/<repo>/"`.

### 3c. Wait for the deployment to go live
```sh
for i in 1 2 3 4 5 6; do
  sleep 10
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    https://<username>.github.io/<repo>/privacy.html)
  echo "Attempt $i: HTTP $status"
  [ "$status" = "200" ] && echo "LIVE!" && break
done
```

Typically takes **30–60 seconds** for first deploy.

### 3d. Verify in browser
Visit `https://<username>.github.io/<repo>/privacy.html` — you should see your privacy page.

---

## 📸 Step 4: Capture Store Screenshots (1280×800)

The Chrome Web Store requires **at least one screenshot** at exactly **1280×800** or **640×400** pixels (no alpha channel).

### 4a. Start a local server
```sh
python3 -m http.server 8765
```

### 4b. Take screenshots with a browser at 1280×800
The clean way is via Playwright/Puppeteer or the browser DevTools device emulator. Manually:

1. Open Chrome DevTools (`Cmd+Opt+I`)
2. Click the **device toolbar** icon (`Cmd+Shift+M`)
3. Set dimensions to **1280×800** with DPR **1**
4. For each game/feature: navigate, then `Cmd+Shift+P` → **"Capture screenshot"**

Or scripted (saves to `screenshots/` folder):
```js
// In a Playwright script
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:8765/');
await page.screenshot({ path: 'screenshots/01-home.png', type: 'png' });
```

### 4c. Verify dimensions
```sh
file screenshots/*.png
# Each should report: PNG image data, 1280 x 800, 8-bit/color RGB, non-interlaced
```

---

## 🌐 Step 5: Sign In to the Chrome Web Store Developer Console

Go to: **https://chrome.google.com/webstore/devconsole**

1. Sign in with your Google account
2. **First time only:** pay the **$5 developer registration fee** (one-time, lifetime account)
3. Complete email/identity verification if prompted

You should land on the **Items** dashboard.

---

## ➕ Step 6: Create / Open Your Item

Click **"Add new item"** → drag your `.zip` onto the upload area.

Once the package validates, you'll be taken to the **Store Listing** edit page.

> **Tip:** If you previously uploaded the extension as a draft, **edit the existing draft** instead of creating a new one — you keep all previously uploaded screenshots and tiles.

---

## 📝 Step 7: Fill the Store Listing Tab

On the left sidebar, click **Store listing**. Fill in:

| Field | What to enter |
|---|---|
| **Description** | Detailed description (up to 16,000 chars). Include features, what makes it unique. |
| **Category** | Best matching category (e.g., `Games` or `Productivity`) |
| **Language** | English (or your primary language) |
| **Store icon** | Auto-loaded from your manifest's 128×128 icon |
| **Screenshots** | Upload at least 1, max 5, sized 1280×800 or 640×400 |
| **Small promo tile** | 440×280 PNG (optional but recommended) |
| **Marquee promo tile** | 1400×560 PNG (optional, for featured slots) |
| **Homepage URL** | `https://<username>.github.io/<repo>/` |
| **Support URL** | Same as homepage, or a contact form/email |
| **Mature content** | Toggle ON only if applicable |

Click **Save draft**.

---

## 🔒 Step 8: Fill the Privacy Practices Tab

Click **Privacy** on the left sidebar. This is where most submissions get blocked.

### 8a. Single purpose description
Write a 1-paragraph statement explaining what your extension does — **narrow and easy to understand**.

> Example: *"Game Hubs provides a single, narrow purpose: a launcher for 8 classic offline browser games. Clicking the toolbar icon opens a popup that lets the user pick and play any of these games."*

### 8b. Permission justification — Remote code
Select **"No, I am not using remote code"** if your extension bundles all JS locally.

> Remote code = `<script src="https://...">`, dynamic `import()` from URLs, `eval()` of remote strings. If you use any of these, select Yes and explain why.

### 8c. Data usage disclosures
Tick **only** the categories of data your extension actually collects (`Personally identifiable info`, `Location`, etc.).
- For an offline-only extension like Game Hubs: **leave them all unchecked**.

### 8d. Three certification disclosures (REQUIRED)
You **must** check all three:
- [x] I do not sell or transfer user data to third parties...
- [x] I do not use or transfer user data for purposes unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

### 8e. Privacy policy URL
Paste your hosted privacy URL:
```
https://<username>.github.io/<repo>/privacy.html
```

Click **Save draft**.

---

## 🟢 Step 9: Verify the Submit Button Is Enabled

If everything is filled correctly, the **"Submit for review"** button at the top right turns **blue and enabled**.

If it's still grey, click **"Why can't I submit?"** — Google lists the missing fields explicitly. Common culprits:
- Missing single purpose description
- Missing privacy policy URL
- One of the three disclosures unchecked
- Missing remote-code justification (when "Yes" is selected)

---

## 🚀 Step 10: Submit for Review

1. Click **"Submit for review"**
2. A confirmation dialog appears
3. Leave **"Publish automatically after it has passed review"** ✅ checked
4. Click the dialog's **"Submit For Review"** button

You'll see a **"Submitting item…"** snackbar, then a green confirmation:

> *"Your extension was submitted for review."*

The status header will change from **Draft** → **Pending review**.

---

## 📅 Step 11: Wait for Review

| Outcome | What to expect |
|---|---|
| ✅ **Approved** | Email + auto-publish (since you ticked the box). Live within minutes. |
| ⚠️ **Needs changes** | Email with specific feedback. Edit, re-save, re-submit. |
| ❌ **Rejected** | Rare. Email explains policy violation. |

**Typical timeline:** 1–7 days. Sometimes faster (24h), occasionally up to 2–3 weeks.

Track status at:
```
https://chrome.google.com/webstore/devconsole
```

---

## 🔗 Step 12: Share the Final URL

Once approved, your extension lives at:
```
https://chromewebstore.google.com/detail/<your-extension-id>
```

The extension ID is shown in the dashboard (e.g., `fncbpinlpcjmmfkenleanhpgeepkikeh`).

---

## 🧰 Useful Commands Reference

```sh
# Check GitHub auth
gh auth status

# Enable GitHub Pages
gh api -X POST /repos/USER/REPO/pages \
  -f "source[branch]=master" -f "source[path]=/"

# Disable GitHub Pages (if needed)
gh api -X DELETE /repos/USER/REPO/pages

# Verify hosted privacy page
curl -I https://USER.github.io/REPO/privacy.html

# Verify ZIP contents
unzip -l my-extension.zip

# Re-create ZIP excluding cruft
rm my-extension.zip && zip -r my-extension.zip . \
  -x "*.DS_Store" -x ".git/*" -x "*.zip" -x "screenshots/*"

# Local dev server
python3 -m http.server 8765
# Then visit http://localhost:8765/

# Take screenshot at exact size (Playwright)
node -e "
  const { chromium } = require('playwright');
  (async () => {
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto('http://localhost:8765/');
    await p.screenshot({ path: '01-home.png' });
    await b.close();
  })();
"
```

---

## ⚠️ Common Pitfalls (And How to Avoid Them)

| Pitfall | Fix |
|---|---|
| Wrong screenshot dimensions | Force exactly **1280×800** or **640×400** with no alpha channel |
| ZIP contains a parent folder | Zip from **inside** the project, not the parent dir |
| `*.png` ignored by global gitignore | Use `git add -f screenshots/` |
| Privacy URL returns 404 | Wait 60 seconds after enabling GitHub Pages, or check branch/path settings |
| "Submit for review" stays disabled | Click "Why can't I submit?" — it lists exact missing fields |
| Description claims a feature not in the build | Reviewers will reject. Update one or the other to match |
| Extension uses remote code without justification | Either remove the remote code or explain why it's necessary |
| Extension requests permissions it doesn't use | Trim `permissions` array in `manifest.json` to only what you actually call |

---

## ✅ Success Criteria Checklist

Before clicking the final submit button, confirm:

- [ ] `manifest.json` description is accurate and matches features
- [ ] All 3 icon sizes present (16, 48, 128)
- [ ] ZIP file built without `.git/`, `.DS_Store`, `screenshots/`, etc.
- [ ] Privacy policy hosted at a public HTTPS URL (returns 200)
- [ ] At least 1 screenshot at 1280×800 uploaded
- [ ] Store description filled (engaging, ≤16,000 chars)
- [ ] Category selected
- [ ] Language selected
- [ ] Single purpose description filled
- [ ] Remote code question answered
- [ ] Data collection checkboxes match reality (none if offline-only)
- [ ] All 3 certification disclosures checked
- [ ] Privacy policy URL filled
- [ ] Homepage + Support URLs filled
- [ ] **"Submit for review"** button is blue/enabled
- [ ] **"Why can't I submit?"** shows no errors

When all boxes are ticked, click **Submit for review** and you're done. 🎉

---

## 🎓 What This Process Taught Us

Beyond the mechanics, this workflow teaches:

1. **Distribution is half the work.** Coding a great extension is meaningless if no one can install it.
2. **Hosting docs publicly is non-negotiable** for any public app — even offline ones.
3. **Privacy compliance is an active design decision**, not an afterthought.
4. **Automation has limits.** Sign-in, payment, and final consent must be human acts.
5. **Documentation pays dividends.** Future-you will thank present-you for `INSTRUCTIONS.md`.

Happy publishing! 🚀
