# ROOT//TERMINAL — TODO HUMAN

Everything I could build without credentials is done and working. These few steps
need you (they require keys, accounts, or a deploy push I can't do for you).

---

## 1. STOCKS (MARKET tab) — needs a free Finnhub key
- **WHO:** you
- **WHAT:** get a free API key, paste it into the code
- **WHERE:** `js/root-terminal.js` → line with `FINNHUB_KEY: ''`
- **HOW:**
  1. Sign up free at https://finnhub.io (60 calls/min on free tier)
  2. Copy your key
  3. Paste between the quotes: `FINNHUB_KEY: 'your_key_here',`
- **WHY it matters:** until then, the MARKET tab shows a "TODO HUMAN" note + empty
  cards. All 4 other tabs work right now with no key.
- **⚠ SECURITY:** a key pasted here is visible to anyone who views your site.
  Free Finnhub keys are low-risk. For a hardened setup, proxy it through a
  Cloudflare Worker instead of putting it in the client (optional, later).

## 2. (Optional) Live BTC price via WebSocket
- The original spec wanted CoinCap WebSocket. CoinCap retired its keyless
  v2 API/WS in 2025 (v3 now needs a key). The macro banner + BTC price already
  run keyless off CoinGecko polling, so nothing is broken.
- If you want sub-second live price later, add a keyed CoinCap v3 socket where
  marked at the bottom of `js/root-terminal.js`.

## 3. Deploy (push to GitHub Pages)
- **WHAT:** commit + push so the new files go live on 4alkubati.com
- **HOW (from the repo root):**
  ```
  git add terminal/ css/terminal.css js/root-terminal.js data/content.json portfolio/index.html
  git commit -m "Add ROOT//TERMINAL markets module"
  git push
  ```
- **WHY I can't:** no git credentials in this session.

---

## What's already done (no action needed)
- `terminal/index.html` — page shell, scanlines, fonts, BTC macro banner, 5 tabs
- `css/terminal.css` — styled to match your existing rust/terminal palette
- `js/root-terminal.js` — data + render engine, error handling, loading skeletons
- CRYPTO / SENTIMENT / TRENDING — fully working, keyless (CoinGecko + Alternative.me)
- LOG — manual event logger, saved in your browser (localStorage)
- Wired in: `markets` command in the root terminal + a "Markets" nav link on the portfolio

## Confirmed isolated from SwingBy
- All work lives inside `4alkubati.github.io/`. The `agents/` framework and the
  `CODE/Swingby` repo were never read or written. Verified clean.

## How to preview locally before deploying
```
cd 4alkubati.github.io
python -m http.server 8000
# open http://localhost:8000/terminal/
```
(The APIs are client-side, so they only return live data in a real browser, not
in a sandbox.)
