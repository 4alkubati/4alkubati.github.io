/* ============================================================
   main.js — Shared logic for all pages (portfolio, future pages)
   ============================================================ */

/* ── CONTENT LOADER ── */
// Path to content.json relative to pages/ folder
const CONTENT_PATH = '../data/content.json';

async function loadContent() {
  try {
    const res = await fetch(CONTENT_PATH);
    return await res.json();
  } catch (e) {
    console.error('Failed to load content.json:', e);
    return null;
  }
}

/* ── SIDEBAR ── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sb-toggle');
  if (!sidebar || !toggle) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

/* ── SCROLL NAV HIGHLIGHT ── */
function initScrollHighlight(sectionIds) {
  const main = document.getElementById('mainscroll');
  if (!main) return;

  main.addEventListener('scroll', () => {
    let current = 0;
    sectionIds.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el && el.offsetTop - main.scrollTop < 300) current = i;
    });
    document.querySelectorAll('.nav-item').forEach((n, i) => {
      n.classList.toggle('active', i === current);
    });
  });
}

function setActiveNav(el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
}

/* ── DYNAMIC RENDERERS ──
   These read content.json and render sections dynamically.
   Call them from each page after loadContent(). */

function renderProjects(projects, containerId) {
  const el = document.getElementById(containerId);
  if (!el || !projects) return;

  el.innerHTML = projects.map(p => {
    const inner = `
      <div class="proj-tag">${p.tag}</div>
      <div class="proj-title">${p.title}</div>
      <div class="proj-desc">${p.desc}</div>
      ${p.link
        ? `<span class="proj-arrow">→</span>`
        : `<span class="proj-status">${p.status || 'WIP'}</span>`
      }
    `;
    return p.link
      ? `<a class="card proj-card" href="${p.link}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="card proj-card proj-no-link">${inner}</div>`;
  }).join('');
}

function renderSkills(skills, containerId) {
  const el = document.getElementById(containerId);
  if (!el || !skills) return;

  el.innerHTML = skills.map(s => `
    <div class="skill-item">
      ${s.name}
      <div class="skill-bar-bg">
        <div class="skill-bar" style="width:${s.level}%"></div>
      </div>
    </div>
  `).join('');
}

function renderLanguages(languages, containerId) {
  const el = document.getElementById(containerId);
  if (!el || !languages) return;

  el.innerHTML = languages.map(l => `
    <div class="lang-card card">
      <div class="lang-icon">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <rect width="52" height="52" rx="8" fill="${l.color}"/>
          <text x="26" y="33" font-family="monospace" font-size="${l.badge.length > 2 ? 13 : 18}"
            font-weight="bold" fill="white" text-anchor="middle">${l.badge}</text>
        </svg>
      </div>
      <div class="lang-name">${l.name}</div>
      <div class="lang-desc">${l.desc}</div>
    </div>
  `).join('');
}

function renderCerts(certs, containerId) {
  const el = document.getElementById(containerId);
  if (!el || !certs) return;

  el.innerHTML = certs.map(c => `
    <div class="cert-item">
      <div class="cert-ico">
        <svg width="44" height="44" viewBox="0 0 44 44">
          <rect width="44" height="44" rx="6" fill="${c.color}"/>
          <text x="22" y="15" font-family="monospace" font-size="7"
            font-weight="bold" fill="white" text-anchor="middle">${c.org.toUpperCase()}</text>
          <text x="22" y="30" font-family="monospace" font-size="${c.badge.length > 3 ? 9 : 13}"
            font-weight="bold" fill="white" text-anchor="middle">${c.badge}</text>
        </svg>
      </div>
      <div>
        <div class="cert-name">${c.name}</div>
        <div class="cert-org">${c.org} // ${c.tag}</div>
      </div>
      <div class="cert-badge ${c.status === 'In Progress' ? 'pending' : ''}">${c.status}</div>
    </div>
  `).join('');
}

/* ── CONTACT FORM ── */
function initContactForm(formspreeId) {
  window.formspree = window.formspree || function(){(formspree.q=formspree.q||[]).push(arguments);};
  formspree('initForm', { formElement: '#contact-form', formId: formspreeId });
}
