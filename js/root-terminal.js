/* ============================================================
   root-terminal.js — ROOT//TERMINAL markets module
   Vanilla JS, no build step. Drops into 4alkubati.github.io.
   Tabs: CRYPTO / MARKET / SENTIMENT / TRENDING / LOG
   Data: CoinGecko + Alternative.me (keyless) · Finnhub (key req)
   ============================================================ */

/* ───────────────────────── CONFIG ───────────────────────── */
const CFG = {
  // ── KEYLESS endpoints ──
  CG_MARKETS:  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h',
  CG_GLOBAL:   'https://api.coingecko.com/api/v3/global',
  CG_TRENDING: 'https://api.coingecko.com/api/v3/search/trending',
  FNG:         'https://api.alternative.me/fng/?limit=1',

  // ── MARKET tab (stocks) — TODO HUMAN ──
  // 1. Get a free key at https://finnhub.io  (free tier = 60 calls/min)
  // 2. Paste it between the quotes below.
  // ⚠ NOTE: a key placed here is PUBLIC — anyone viewing your site can read it.
  //   Free Finnhub keys are low-risk, but for production proxy it via a Cloudflare Worker.
  FINNHUB_KEY: '', // TODO HUMAN: paste free Finnhub key here
  FINNHUB_QUOTE: 'https://finnhub.io/api/v1/quote?symbol=',
  STOCKS: [
    { sym: 'SPY',  name: 'S&P 500 ETF' },
    { sym: 'QQQ',  name: 'Nasdaq 100 ETF' },
    { sym: 'NVDA', name: 'NVIDIA Corp' },
  ],

  // ── Polling (ms) ──
  POLL_CRYPTO: 60_000,
  POLL_GLOBAL: 60_000,
  POLL_MARKET: 30_000,
  POLL_SLOW:   300_000, // sentiment + trending: 5 min
  FETCH_TIMEOUT: 12_000,
};

/* ───────────────────────── STATE ───────────────────────── */
const STATE = {
  activeTab: 'crypto',
  timers: {},
  macro: { btcChange: null, btcDom: null }, // merged from two sources
  connOk: false,
};
const LOG_KEY = 'root_terminal_log_v1';

/* ───────────────────────── HELPERS ───────────────────────── */
const $  = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

async function fetchJSON(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CFG.FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...opts });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1)    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}
function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}
function fmtAbbr(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
const dir = (n) => (n >= 0 ? 'up' : 'down');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function skeleton(rows) {
  return `<div class="skeleton-rows">${Array.from({ length: rows }).map(() => '<div class="skel"></div>').join('')}</div>`;
}
function panelError(container, msg) {
  container.innerHTML = `<div class="panel-error">// FEED ERROR — ${esc(msg)}. Retrying on next cycle.</div>`;
}

function setConn(ok) {
  STATE.connOk = ok;
  const dot = $('conn-dot'), lbl = $('conn-label');
  if (!dot || !lbl) return;
  dot.classList.toggle('live', ok);
  dot.classList.toggle('dead', !ok);
  lbl.textContent = ok ? 'LIVE' : 'FEED DOWN';
}

/* ───────────────────────── CLOCK ───────────────────────── */
function startClock() {
  const tick = () => {
    const el = $('tb-clock');
    if (el) el.textContent = new Date().toUTCString().slice(17, 25) + ' UTC';
  };
  tick();
  setInterval(tick, 1000);
}

/* ───────────────────────── TABS ───────────────────────── */
function initTabs() {
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}
function switchTab(name) {
  STATE.activeTab = name;
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
}

/* ───────────────────── MACRO BANNER ───────────────────── */
function renderMacro() {
  const banner = $('macro-banner'), tag = $('macro-tag'), detail = $('macro-detail');
  if (!banner) return;
  const { btcChange, btcDom } = STATE.macro;

  if (btcChange == null) {
    banner.dataset.state = 'error';
    tag.textContent = '// MACRO SIGNAL UNAVAILABLE';
    detail.textContent = '';
    return;
  }

  // Primary state: BTC 24h direction
  if (btcChange > 0) {
    banner.dataset.state = 'on';
    tag.textContent = '▲ RISK ON';
  } else {
    banner.dataset.state = 'off';
    tag.textContent = '▼ RISK OFF';
  }

  // Dominance override note (yellow) when alts bleeding to BTC
  let domNote = '';
  if (btcDom != null) {
    domNote = ` · BTC dominance ${btcDom.toFixed(1)}%`;
    if (btcDom > 55) {
      banner.dataset.state = 'warn';
      tag.textContent = '◆ ALTS BLEEDING TO BTC';
      domNote = ` · dominance ${btcDom.toFixed(1)}% (>55%)`;
    }
  }
  detail.textContent = `BTC 24h ${fmtPct(btcChange)}${domNote}`;
}

/* ───────────────────────── CRYPTO ───────────────────────── */
async function loadCrypto() {
  const body = $('crypto-body');
  try {
    const data = await fetchJSON(CFG.CG_MARKETS);
    setConn(true);

    // feed macro banner from BTC row
    const btc = data.find((c) => c.id === 'bitcoin');
    if (btc) { STATE.macro.btcChange = btc.price_change_percentage_24h; renderMacro(); }

    body.innerHTML =
      `<div class="row head">
         <span>#</span><span>Asset</span><span class="cell-num">Price</span>
         <span class="cell-num">24h</span><span class="cell-num cell-mcap">Mkt Cap</span>
       </div>` +
      data.map((c, i) => `
        <div class="row">
          <span class="cell-rank">${i + 1}</span>
          <span class="cell-name">
            <img src="${esc(c.image)}" alt="" loading="lazy">
            ${esc(c.name)} <span class="sym">${esc(c.symbol)}</span>
          </span>
          <span class="cell-num">${fmtPrice(c.current_price)}</span>
          <span class="cell-num ${dir(c.price_change_percentage_24h)}">${fmtPct(c.price_change_percentage_24h)}</span>
          <span class="cell-num cell-mcap">${fmtAbbr(c.market_cap)}</span>
        </div>`).join('');
  } catch (e) {
    setConn(false);
    if (body.querySelector('.skeleton-rows') || !body.querySelector('.row')) panelError(body, e.message);
  }
}

/* ───────────────────────── GLOBAL (dominance) ───────────────────────── */
async function loadGlobal() {
  try {
    const json = await fetchJSON(CFG.CG_GLOBAL);
    const dom = json?.data?.market_cap_percentage?.btc;
    if (dom != null) { STATE.macro.btcDom = dom; renderMacro(); renderDominanceGauge(dom); }
  } catch (e) {
    /* macro still works off BTC change; dominance just stays blank */
  }
}

/* ───────────────────────── MARKET (stocks) ───────────────────────── */
async function loadMarket() {
  const body = $('market-body');
  if (!body) return;

  // No key → render structure + clear human handoff note (TODO HUMAN)
  if (!CFG.FINNHUB_KEY) {
    $('market-meta').textContent = 'Finnhub · key needed';
    body.innerHTML =
      `<div class="panel-note">
         <strong>TODO HUMAN —</strong> stock quotes need a free Finnhub key.
         Get one at finnhub.io, then paste it into <code>FINNHUB_KEY</code> in
         <code>js/root-terminal.js</code>. The crypto tabs already run with no key.
       </div>` +
      CFG.STOCKS.map((s) => `
        <div class="mkt-card">
          <div><div class="mkt-sym">${esc(s.sym)}</div><div class="mkt-name">${esc(s.name)}</div></div>
          <div><div class="mkt-price" style="color:var(--col-muted)">— —</div>
               <div class="mkt-chg" style="color:var(--col-muted)">awaiting key</div></div>
        </div>`).join('');
    return;
  }

  try {
    const quotes = await Promise.all(
      CFG.STOCKS.map(async (s) => {
        const q = await fetchJSON(CFG.FINNHUB_QUOTE + encodeURIComponent(s.sym) + '&token=' + CFG.FINNHUB_KEY);
        return { ...s, ...q }; // q: { c, d, dp, h, l, o, pc }
      })
    );
    setConn(true);
    $('market-meta').textContent = 'Finnhub · 30s';
    body.innerHTML = quotes.map((q) => `
      <div class="mkt-card">
        <div><div class="mkt-sym">${esc(q.sym)}</div><div class="mkt-name">${esc(q.name)}</div></div>
        <div>
          <div class="mkt-price">${fmtPrice(q.c)}</div>
          <div class="mkt-chg ${dir(q.dp)}">${fmtPct(q.dp)} (${q.d >= 0 ? '+' : ''}${(q.d ?? 0).toFixed(2)})</div>
        </div>
      </div>`).join('');
  } catch (e) {
    panelError(body, e.message);
  }
}

/* ───────────────────────── SENTIMENT ───────────────────────── */
async function loadSentiment() {
  const body = $('sentiment-body');
  if (!body) return;
  try {
    const json = await fetchJSON(CFG.FNG);
    const fng = json?.data?.[0];
    const val = fng ? Number(fng.value) : null;
    const cls = fng ? fng.value_classification : '—';

    // Color by value: red(fear) → amber → green(greed)
    const color = val == null ? 'var(--col-muted)'
      : val < 25 ? 'var(--sig-down)'
      : val < 45 ? '#ff8c1a'
      : val < 55 ? 'var(--sig-warn)'
      : val < 75 ? '#9ade5a'
      : 'var(--sig-up)';

    body.innerHTML = `
      <div class="gauge">
        <div class="gauge-label">Fear &amp; Greed Index</div>
        <div class="gauge-value" style="color:${color}">${val ?? '—'}</div>
        <div class="gauge-class" style="color:${color}">${esc(cls)}</div>
        <div class="gauge-bar-bg"><div class="gauge-bar" style="width:${val ?? 0}%;background:${color}"></div></div>
        <div class="gauge-sub">0 = extreme fear · 100 = extreme greed</div>
      </div>
      <div class="gauge" id="dom-gauge">
        <div class="gauge-label">BTC Dominance</div>
        <div class="gauge-value" id="dom-val" style="color:var(--col-rust-lt)">
          ${STATE.macro.btcDom != null ? STATE.macro.btcDom.toFixed(1) + '%' : '…'}
        </div>
        <div class="gauge-class" style="color:var(--col-muted)">share of total cap</div>
        <div class="gauge-bar-bg"><div class="gauge-bar" id="dom-bar"
          style="width:${STATE.macro.btcDom ?? 0}%;background:var(--col-rust-lt)"></div></div>
        <div class="gauge-sub">&gt;55% = capital rotating into BTC</div>
      </div>`;
    // ensure dominance fresh
    if (STATE.macro.btcDom == null) loadGlobal();
  } catch (e) {
    panelError(body, e.message);
  }
}
function renderDominanceGauge(dom) {
  const v = $('dom-val'), b = $('dom-bar');
  if (v) v.textContent = dom.toFixed(1) + '%';
  if (b) b.style.width = dom + '%';
}

/* ───────────────────────── TRENDING ───────────────────────── */
async function loadTrending() {
  const body = $('trending-body');
  if (!body) return;
  try {
    const json = await fetchJSON(CFG.CG_TRENDING);
    const coins = (json?.coins || []).slice(0, 7);
    body.innerHTML = coins.map((c, i) => {
      const it = c.item || {};
      return `
        <div class="trend-card">
          <span class="trend-rank">#${i + 1}</span>
          <img src="${esc(it.thumb)}" alt="" loading="lazy">
          <div>
            <div class="trend-name">${esc(it.name)} <span class="trend-sym">${esc(it.symbol)}</span></div>
            <div class="trend-sym">rank ${it.market_cap_rank ?? '—'}</div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    panelError(body, e.message);
  }
}

/* ───────────────────────── LOG (localStorage) ───────────────────────── */
function readLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; }
  catch { return []; }
}
function writeLog(arr) { localStorage.setItem(LOG_KEY, JSON.stringify(arr)); }

function renderLog() {
  const list = $('log-list');
  const items = readLog().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!items.length) {
    list.innerHTML = `<div class="log-empty">// No events logged. Add market events above — stored locally in your browser.</div>`;
    return;
  }
  list.innerHTML = items.map((it) => `
    <div class="log-row">
      <span class="log-date">${esc(it.date)}</span>
      <span class="log-event">${esc(it.event)}</span>
      <span class="log-tk">${esc(it.ticker || '')}</span>
      <span class="log-imp ${esc(it.impact)}">${esc(it.impact)}</span>
      <button class="log-del" data-id="${esc(it.id)}" title="Delete">✕</button>
    </div>`).join('');
  list.querySelectorAll('.log-del').forEach((btn) =>
    btn.addEventListener('click', () => { deleteLog(btn.dataset.id); }));
}
function deleteLog(id) { writeLog(readLog().filter((x) => x.id !== id)); renderLog(); }

function initLogForm() {
  const form = $('log-form');
  if (!form) return;
  $('log-date').value = new Date().toISOString().slice(0, 10);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: $('log-date').value,
      event: $('log-event').value.trim(),
      ticker: $('log-ticker').value.trim().toUpperCase(),
      impact: $('log-impact').value,
    };
    if (!entry.date || !entry.event) return;
    const arr = readLog(); arr.push(entry); writeLog(arr);
    $('log-event').value = ''; $('log-ticker').value = '';
    renderLog();
  });
}

/* ───────────────────────── SCHEDULER ───────────────────────── */
function poll(fn, ms) {
  fn(); // run immediately
  STATE.timers[fn.name] = setInterval(() => {
    if (document.hidden) return; // pause when tab not visible — saves rate limit
    fn();
  }, ms);
}

/* ───────────────────────── BOOT ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  initTabs();
  initLogForm();
  renderLog();

  // keyless feeds
  poll(loadCrypto,    CFG.POLL_CRYPTO);
  poll(loadGlobal,    CFG.POLL_GLOBAL);
  poll(loadSentiment, CFG.POLL_SLOW);
  poll(loadTrending,  CFG.POLL_SLOW);

  // stocks (renders TODO-HUMAN note until key added)
  loadMarket();
  if (CFG.FINNHUB_KEY) STATE.timers.market = setInterval(() => { if (!document.hidden) loadMarket(); }, CFG.POLL_MARKET);

  // refresh immediately when user returns to the tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { loadCrypto(); loadGlobal(); }
  });
});

/* ────────────────────────────────────────────────────────────
   TODO HUMAN — OPTIONAL UPGRADE (live BTC price via WebSocket)
   The original spec called for CoinCap WebSocket (wss://ws.coincap.io).
   CoinCap's keyless v2 API/WS was retired in 2025; v3 now requires a key.
   The macro banner + BTC price already run keyless off CoinGecko polling.
   If you want sub-second live price, add a keyed CoinCap v3 socket here.
   ──────────────────────────────────────────────────────────── */
