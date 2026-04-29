/* ============================================================
   terminal.js — Command parser and router for index.html
   ============================================================ */

let content = null;
let skipTimer = null;
let skipSeconds = 10;
let skipCountdown = skipSeconds;

/* ── BOOT ── */
async function init() {
  // Load content.json
  try {
    const res = await fetch('../data/content.json');
    content = await res.json();
  } catch (e) {
    print('// ERROR: Failed to load content data.', 'error');
  }

  await runBootSequence();
  startSkipTimer();
  focusInput();
}

/* ── BOOT SEQUENCE ── */
async function runBootSequence() {
  const lines = [
    { text: `root@4alkubati:~$ ./boot --init`,           cls: 'bright', delay: 0    },
    { text: `> Mounting filesystem.............. OK`,     cls: '',       delay: 400  },
    { text: `> Loading kernel modules........... OK`,     cls: '',       delay: 800  },
    { text: `> Establishing secure connection... OK`,     cls: '',       delay: 1200 },
    { text: `> WARNING: Unauthorized access will be traced`, cls: 'warn', delay: 1700 },
    { text: `> Decrypting identity profile...... OK`,     cls: '',       delay: 2200 },
    { text: `> User: AMR AL-KUBATI`,                      cls: 'white',  delay: 2600 },
    { text: `> Role: DEVELOPER / CYBERSECURITY / ENTREPRENEUR`, cls: 'white', delay: 2900 },
    { text: `> Node: CANADA`,                             cls: 'white',  delay: 3200 },
    { text: `> ACCESS GRANTED.`,                          cls: 'bright', delay: 3700 },
    { text: ``,                                           cls: '',       delay: 4100 },
    { text: `Type 'help' to see available commands.`,     cls: 'muted',  delay: 4100 },
  ];

  for (const line of lines) {
    await wait(line.delay === 0 ? 0 : 400);
    print(line.text, line.cls);
  }

  await wait(300);
}

/* ── SKIP TIMER ── */
function startSkipTimer() {
  const el = document.getElementById('skip-counter');
  if (!el) return;

  el.style.display = 'block';
  updateSkipDisplay();

  skipTimer = setInterval(() => {
    skipCountdown--;
    updateSkipDisplay();
    if (skipCountdown <= 0) {
      clearInterval(skipTimer);
      navigate('pages/portfolio.html');
    }
  }, 1000);
}

function updateSkipDisplay() {
  const el = document.getElementById('skip-counter');
  if (el) el.textContent = `// Auto-skip to portfolio in ${skipCountdown}s  [press any key to cancel]`;
}

function cancelSkip() {
  if (skipTimer) {
    clearInterval(skipTimer);
    skipTimer = null;
    const el = document.getElementById('skip-counter');
    if (el) el.style.display = 'none';
  }
}

/* ── INPUT HANDLER ── */
function handleInput(e) {
  if (e.key === 'Enter') {
    const input = document.getElementById('term-input');
    const cmd = input.value.trim().toLowerCase();
    input.value = '';
    if (cmd) {
      print(`root@4alkubati:~$ ${cmd}`, 'prompt');
      execute(cmd);
    }
  } else {
    // Any key press cancels skip timer
    cancelSkip();
  }
}

/* ── COMMAND EXECUTOR ── */
function execute(cmd) {
  if (!content) { print('// ERROR: Content not loaded.', 'error'); return; }

  const matched = content.commands.find(c => c.cmd === cmd);

  if (!matched) {
    print(`// Command not found: '${cmd}'. Type 'help' for available commands.`, 'error');
    return;
  }

  switch (cmd) {
    case 'help':
      print('// Available commands:', 'bright');
      content.commands.forEach(c => {
        print(`   ${c.cmd.padEnd(12)} — ${c.desc}`, 'white');
      });
      break;

    case 'whoami':
      print(`// ${content.meta.handle}`, 'bright');
      print(`   ${content.meta.title}`, 'white');
      print(`   ${content.meta.bio}`, 'muted');
      break;

    case 'clear':
      document.getElementById('term-output').innerHTML = '';
      break;

    default:
      if (matched.route) {
        print(`// Navigating to ${cmd}...`, 'bright');
        setTimeout(() => navigate(matched.route), 600);
      }
  }
}

/* ── HELPERS ── */
function print(text, cls = '') {
  const out = document.getElementById('term-output');
  const line = document.createElement('div');
  line.className = `term-line ${cls}`;
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function navigate(route) {
  // Works from root index.html — routes are relative
  window.location.href = route;
}

function focusInput() {
  const input = document.getElementById('term-input');
  if (input) {
    input.addEventListener('keydown', handleInput);
    // Click anywhere on terminal to focus input
    document.getElementById('terminal-wrap')?.addEventListener('click', () => input.focus());
    input.focus();
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ── SKIP BUTTON ── */
function skipToPortfolio() {
  cancelSkip();
  navigate('pages/portfolio.html');
}

/* ── START ── */
document.addEventListener('DOMContentLoaded', init);
