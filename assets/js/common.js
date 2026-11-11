// Shared page shell: nav, footer, wallet button, preview banner, toasts, helpers.
import { CONFIG, THEMES } from './config.js';
import { MODE, NET, CONTRACT, api, bus, wallet, connect, disconnect, switchNetwork, onRightChain, short, restoreWallet, skipDay, resetPreview, explorerAddress } from './chain.js';
import { clayDefs, thimble } from './characters.js';
import { lookImg } from './art.js';
import { emptyRecipe } from './recipe.js';

export const ROOT = document.body.dataset.root || './';
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const themeOf = (day) => THEMES[((day % 30) + 30) % 30];
export const fmt = (n) => Number(n).toLocaleString('en-US');
export const dayLabel = (day) => new Date(day * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// ---------------------------------------------------------------- look-name word filter
const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'slut', 'whore', 'nigg', 'fag', 'retard', 'rape', 'nazi', 'porn', 'sex', 'kill', 'twat', 'wank', 'bastard'];
export function nameProblem(name) {
  const n = name.trim();
  if (new TextEncoder().encode(n).length > 20) return 'Keep it to 20 characters or fewer.';
  const flat = n.toLowerCase().replace(/[^a-z]/g, '').replace(/0/g, 'o');
  if (BLOCKED.some((w) => flat.includes(w))) return "Miss Button says: let's keep it sweet! Try another name.";
  return '';
}

// ---------------------------------------------------------------- countdown to next UTC day
export function untilNextDay() {
  const ms = 86400000 - (Date.now() % 86400000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- toasts + tx overlay
export function toast(msg, kind = '') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.classList.add('out'), 4200);
  setTimeout(() => t.remove(), 4700);
}

/** Thimble carries a sign while a transaction is pending. */
export function pending(text = 'Saving…') {
  const el = document.createElement('div');
  el.className = 'tx-pending';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div class="tx-thimble">${thimble({ hanger: false, sign: esc(text) })}</div><p class="tx-hint">Confirm in your wallet, then hold tight while BOT Chain writes it down.</p>`;
  document.body.append(el);
  return { done: () => el.remove(), set: (t) => { const s = el.querySelector('text'); if (s) s.textContent = t; } };
}

/** Wrap a write: shows Thimble while pending, friendly errors with a retry hint. */
export async function withTx(label, fn) {
  const p = pending(label);
  try { return await fn((hash) => p.set(hash ? 'Writing…' : label)); }
  catch (e) { toast(e.message || 'Something went wrong — please try again.', 'error'); throw e; }
  finally { p.done(); }
}

// ---------------------------------------------------------------- nav
function nav(active) {
  const link = (href, label, key) => `<a href="${ROOT}${href}" class="nav-link${active === key ? ' is-active' : ''}">${label}</a>`;
  return `<header class="nav" id="top">
  <a class="logo" href="${ROOT}" aria-label="Jane's Closet home">${clayWord("Jane's Closet")}</a>
  <nav class="nav-links" aria-label="Main">
    ${link('studio/', 'Studio', 'studio')}${link('challenge/', "Today's challenge", 'challenge')}${link('#winners', 'Winners', 'winners')}${link('closet/', 'My closet', 'closet')}
  </nav>
  <div class="nav-actions">
    <button type="button" class="clay-btn small ghost" id="walletBtn">Connect wallet</button>
    <a class="clay-btn small pink hide-sm" href="${ROOT}studio/">👗 Start styling</a>
    <button type="button" class="nav-burger" aria-label="Menu" aria-expanded="false">☰</button>
  </div>
</header>`;
}

/** Letters that look like rolled clay. */
export function clayWord(text) {
  const colours = ['#FF85A2', '#C9A7EB', '#A7D3F2', '#A8E6CF', '#FFC4A3', '#F4A7B9'];
  return `<span class="clay-word">${[...text].map((ch, i) => (ch === ' ' ? '<span class="sp"> </span>' : `<span style="--c:${colours[i % colours.length]};--r:${((i * 37) % 9) - 4}deg">${esc(ch)}</span>`)).join('')}</span>`;
}

// ---------------------------------------------------------------- footer: the runway + clothing tags
function footer() {
  const addr = CONTRACT;
  const shortAddr = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : 'deploying soon';
  const explorer = addr ? explorerAddress(addr) : NET.explorer;
  const steps = Array.from({ length: 9 }, (_, i) => `<span class="step" style="--i:${i}"></span>`).join('');
  return `<footer class="footer">
  <div class="runway" aria-hidden="true">
    <div class="runway-strip">${steps}</div>
    <div class="runway-cutie" id="runwayCutie"></div>
  </div>
  <div class="tags">
    <div class="tag-hang tag-hang-big"><span class="tag-string" aria-hidden="true"></span>
    <a class="tag tag-big" href="${CONFIG.links.botchain}" target="_blank" rel="noopener" aria-label="Made on BOT Chain — visit botchain.ai">
      <span class="tag-hole" aria-hidden="true"></span>
      <span class="tag-kicker">Made on</span>
      <img src="${ROOT}assets/img/botchain-logo-ink.png" alt="BOT Chain" class="tag-logo" width="205" height="40">
      <span class="tag-sub">botchain.ai ↗</span>
    </a></div>
    <div class="tag-hang tag-hang-care"><span class="tag-string" aria-hidden="true"></span>
    <div class="tag tag-care">
      <span class="tag-hole" aria-hidden="true"></span>
      <p class="care-title">Care label</p>
      <p class="care-line">chain ID ${NET.chainId} · <button type="button" class="copy-addr" data-addr="${addr}" ${addr ? '' : 'disabled'} title="Copy contract address">${shortAddr} ${addr ? '⧉' : ''}</button></p>
      <p class="care-stats"><span>LOOKS SAVED <b id="statLooks">—</b></span> · <span>CROWNS <b id="statCrowns">—</b></span></p>
      <a class="clay-btn small pink" href="${explorer}" target="_blank" rel="noopener">View on explorer ↗</a>
    </div></div>
  </div>
  <nav class="footer-links" aria-label="Footer">
    <a href="${ROOT}studio/">Studio</a><a href="${ROOT}challenge/">Today's challenge</a><a href="${ROOT}#winners">Winners</a><a href="${ROOT}#how">How it works</a>
    <a href="${CONFIG.links.github}" target="_blank" rel="noopener">GitHub</a><a href="${CONFIG.links.x}" target="_blank" rel="noopener">X</a><a href="${ROOT}#credits">Credits</a>
  </nav>
  <p class="footer-bottom" id="credits">© 2026 Jane's Closet · handmade with clay and BOT Chain · all characters and art are original</p>
</footer>`;
}

function previewBar() {
  if (MODE !== 'preview') return '';
  return `<div class="preview-bar" role="note">
  <span>🧪 <b>Preview mode</b> — the contract isn't connected yet, so saves and votes are simulated in this browser. Sample cuties are made up.</span>
  <span class="preview-actions"><button type="button" id="pvSkip">Skip a day →</button><button type="button" id="pvReset">Reset</button></span>
</div>`;
}

// ---------------------------------------------------------------- wallet button
function renderWallet() {
  const b = $('#walletBtn');
  if (!b) return;
  if (!wallet.address) { b.textContent = 'Connect wallet'; b.classList.remove('warn'); return; }
  if (!onRightChain()) { b.textContent = 'Switch to BOT Chain'; b.classList.add('warn'); return; }
  b.classList.remove('warn');
  b.textContent = `● ${short(wallet.address)}`;
  b.title = 'Connected — click to disconnect';
}

async function refreshStats() {
  try {
    const s = await api.stats();
    if ($('#statLooks')) $('#statLooks').textContent = fmt(s.looks);
    if ($('#statCrowns')) $('#statCrowns').textContent = fmt(s.crowns);
  } catch { /* footer stats are optional */ }
}

/** Builds nav + footer and wires shared bits. Call once per page. */
export async function shell(active) {
  document.body.insertAdjacentHTML('afterbegin', clayDefs() + previewBar() + nav(active));
  document.body.insertAdjacentHTML('beforeend', footer());
  if (reducedMotion) document.documentElement.classList.add('reduced');

  // runway cutie: a fixed pose
  const pose = { ...emptyRecipe(), skin: 4, face: 2, hair: 4, hairColour: 1, top: 0, bottom: 0, dress: 4, dressColour: 1, shoes: 6, shoesColour: 1, acc: [5, 0, 0], accColour: [2, 0, 0], background: 6 };
  const rc = $('#runwayCutie');
  if (rc) rc.append(lookImg(pose, 'A clay cutie striking a pose at the end of the runway'));

  $('#walletBtn').addEventListener('click', async () => {
    try {
      if (!wallet.address) await connect();
      else if (!onRightChain()) await switchNetwork();
      else if (confirm('Disconnect your wallet from Jane\'s Closet?')) disconnect();
    } catch (e) { toast(e.message, 'error'); }
  });
  const burger = $('.nav-burger');
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
  $('.copy-addr')?.addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(e.currentTarget.dataset.addr); toast('Contract address copied ✓'); } catch { toast(e.currentTarget.dataset.addr); }
  });
  $('#pvSkip')?.addEventListener('click', () => { skipDay(); toast('⏭ A new day! Sample cuties entered the new challenge.'); });
  $('#pvReset')?.addEventListener('click', () => { if (confirm('Reset the preview? Your simulated looks, votes and crowns are cleared.')) { resetPreview(); location.reload(); } });

  bus.addEventListener('wallet', renderWallet);
  bus.addEventListener('data', refreshStats);
  await restoreWallet();
  renderWallet();
  refreshStats();
}
