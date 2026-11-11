import { shell, $, $$, esc, toast, withTx, themeOf, reducedMotion, nameProblem, ROOT } from './common.js';
import { api, wallet, bus } from './chain.js';
import { lookURL, loadImage, SKIN, STICKERS, stickerXY, W, H } from './art.js';
import { emptyRecipe, randomRecipe, decodeRecipe, encodeRecipe, COUNTS } from './recipe.js';
import { TABS, itemPreview } from './wardrobe.js';
import { missButton, thimble } from './characters.js';
import { CONFIG } from './config.js';

await shell('studio');

// ---------------------------------------------------------------- state
const DRAFT = `${CONFIG.storageKey}.draft`;
const params = new URLSearchParams(location.search);
let recipe = emptyRecipe();
try {
  if (params.get('look')) recipe = decodeRecipe(params.get('look'));
  else if (localStorage.getItem(DRAFT)) recipe = decodeRecipe(localStorage.getItem(DRAFT));
} catch { /* start fresh */ }
let tab = TABS.find((t) => t.key === params.get('tab')) || TABS[0];
let lastSaved = null; // { id, name }

// ---------------------------------------------------------------- stage: 3 clay frames, swapped at ~12 fps
const canvas = $('#stage');
const ctx = canvas.getContext('2d');
let frames = [];
let frameIdx = 0;
let renderToken = 0;

async function render({ bounce = false } = {}) {
  const token = ++renderToken;
  try { localStorage.setItem(DRAFT, encodeRecipe(recipe)); } catch { /* ignore */ }
  const seeds = reducedMotion ? [1] : [1, 2, 3];
  const first = await loadImage(lookURL(recipe, { seed: seeds[0] }));
  if (token !== renderToken) return;
  frames = [first];
  draw();
  $('#frame').classList.remove('is-loading');
  if (bounce && window.gsap && !reducedMotion) {
    gsap.fromTo(canvas, { scaleX: 1.06, scaleY: 0.9, transformOrigin: '50% 90%' }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'steps(6)' });
  }
  const rest = await Promise.all(seeds.slice(1).map((s) => loadImage(lookURL(recipe, { seed: s }))));
  if (token === renderToken) frames = [first, ...rest];
}
function draw() {
  const img = frames[frameIdx % frames.length];
  if (!img) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}
if (!reducedMotion) setInterval(() => { if (frames.length > 1 && !document.hidden) { frameIdx++; draw(); } }, 1000 / 12 * 1.5);

// ---------------------------------------------------------------- Miss Button + Thimble
$('#peek').innerHTML = missButton();
const LINES = ['Ooh la la!', 'Magnifique!', 'Très chic!', 'Squishy perfection!', 'Now THAT is a look!', 'Darling, you slay!', 'Fabulous!', 'I adore it!'];
let speechTimer;
function say(text = LINES[Math.floor(Math.random() * LINES.length)]) {
  const s = $('#speech');
  s.textContent = text;
  s.classList.add('show');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => s.classList.remove('show'), 1800);
}
$('#runner').innerHTML = thimble();
function thimbleRun() {
  if (reducedMotion || !window.gsap) return;
  gsap.fromTo('#runner', { left: -100 }, { left: canvas.clientWidth + 20, duration: 1.4, ease: 'steps(12)' });
}

// ---------------------------------------------------------------- tabs + items
function renderTabs() {
  $('#tabs').innerHTML = TABS.map((t) => `<button type="button" class="tab" role="tab" aria-selected="${t === tab}" data-key="${t.key}"><span class="ico">${t.ico}</span>${t.label}</button>`).join('');
}
const isOn = (i) => {
  const v = tab.sel(recipe);
  return Array.isArray(v) ? v.includes(i) : v === i;
};
function renderItems() {
  const colour = tab.colour ? tab.colour(recipe) : 0;
  const start = tab.none ? 0 : tab.key === 'hair' || tab.key === 'background' ? 0 : 1;
  const end = tab.key === 'hair' || tab.key === 'background' ? tab.count - 1 : tab.count;
  const html = [];
  for (let i = start; i <= end; i++) {
    if (i === 0 && tab.none) {
      html.push(`<button type="button" class="item none" data-i="0" aria-pressed="${isOn(0)}" aria-label="None">🚫<span>None</span></button>`);
      continue;
    }
    const name = tab.names[tab.key === 'hair' || tab.key === 'background' ? i : i - 1];
    html.push(`<button type="button" class="item" data-i="${i}" aria-pressed="${isOn(i)}">${itemPreview(tab, i, colour)}<span>${esc(name)}</span></button>`);
  }
  $('#items').innerHTML = html.join('');
  $('#hint').hidden = tab.key !== 'sticker';
  renderSwatches();
}
function renderSwatches() {
  const panel = $('#colourPanel');
  if (!tab.colours) { panel.hidden = true; return; }
  panel.hidden = false;
  $('#colourTitle').textContent = `${tab.label} colour`;
  const cur = tab.colour(recipe);
  $('#swatches').innerHTML = tab.colours.map((c, i) => `<button type="button" class="swatch" style="--c:${c}" data-c="${i}" aria-pressed="${i === cur}" aria-label="Colour ${i + 1}"></button>`).join('');
}
function renderCutieControls() {
  $('#skins').innerHTML = SKIN.map((c, i) => `<button type="button" class="swatch" style="--c:${c}" data-skin="${i}" aria-pressed="${i === recipe.skin}" aria-label="Skin tone ${i + 1}"></button>`).join('');
  $('#faces').innerHTML = ['😊 Smiley', '😌 Sleepy', '😉 Wink'].map((f, i) => `<button type="button" class="clay-btn small ${i === recipe.face ? 'pink' : ''}" data-face="${i}">${f}</button>`).join('');
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (!b) return;
  tab = TABS.find((t) => t.key === b.dataset.key);
  renderTabs(); renderItems(); thimbleRun();
});

// Up to 3 slots; `extra` is a parallel array (colours or sticker positions) that moves with its item.
function toggleMulti(list, extra, i, fresh) {
  const at = list.indexOf(i);
  if (at >= 0) { list[at] = 0; return; }
  let slot = list.indexOf(0);
  if (slot < 0) { list.shift(); list.push(0); extra.shift(); extra.push(fresh()); slot = 2; } // full: the oldest pops off
  list[slot] = i;
  extra[slot] = fresh();
}

$('#items').addEventListener('click', (e) => {
  const b = e.target.closest('.item');
  if (!b) return;
  const i = Number(b.dataset.i);
  if (tab.key === 'acc') {
    const colour = tab.colour(recipe);
    toggleMulti(recipe.acc, recipe.accColour, i, () => colour);
  } else if (tab.key === 'sticker') {
    toggleMulti(recipe.stickers, recipe.stickerPos, i, () => [20 + Math.floor(Math.random() * 215), 20 + Math.floor(Math.random() * 200)]);
  } else {
    if (isOn(i) && tab.none) tab.set(recipe, 0); else tab.set(recipe, i);
  }
  renderItems();
  render({ bounce: true });
  if (Math.random() < 0.45) say();
});

$('#swatches').addEventListener('click', (e) => {
  const b = e.target.closest('.swatch');
  if (!b) return;
  tab.setColour(recipe, Number(b.dataset.c));
  renderItems();
  render();
});
$('#skins').addEventListener('click', (e) => {
  const b = e.target.closest('[data-skin]');
  if (!b) return;
  recipe.skin = Number(b.dataset.skin);
  renderCutieControls(); render();
});
$('#faces').addEventListener('click', (e) => {
  const b = e.target.closest('[data-face]');
  if (!b) return;
  recipe.face = Number(b.dataset.face);
  renderCutieControls(); render({ bounce: true });
});

$('#surprise').addEventListener('click', () => {
  recipe = randomRecipe();
  renderItems(); renderCutieControls(); render({ bounce: true }); say('Surprise, darling!'); thimbleRun();
});
$('#reset').addEventListener('click', () => {
  recipe = emptyRecipe();
  renderItems(); renderCutieControls(); render({ bounce: true });
});

// ---------------------------------------------------------------- drag stickers on the stage
let drag = null;
function toPicture(e) {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
}
canvas.addEventListener('pointerdown', (e) => {
  const [x, y] = toPicture(e);
  let best = -1, bd = 46;
  recipe.stickers.forEach((s, i) => {
    if (!s) return;
    const [sx, sy] = stickerXY(recipe.stickerPos[i]);
    const d = Math.hypot(sx - x, sy - y);
    if (d < bd) { bd = d; best = i; }
  });
  if (best < 0) return;
  drag = best;
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
  e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => {
  if (drag === null) {
    const [x, y] = toPicture(e);
    const near = recipe.stickers.some((s, i) => s && Math.hypot(stickerXY(recipe.stickerPos[i])[0] - x, stickerXY(recipe.stickerPos[i])[1] - y) < 46);
    canvas.style.cursor = near ? 'grab' : '';
    return;
  }
  const [x, y] = toPicture(e);
  const clampB = (v) => Math.max(0, Math.min(255, Math.round(v)));
  recipe.stickerPos[drag] = [clampB(((x - 30) / 340) * 255), clampB(((y - 30) / 400) * 255)];
  render();
});
const endDrag = () => { drag = null; canvas.style.cursor = ''; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// ---------------------------------------------------------------- photo card (PNG)
async function photoCard() {
  const day = await api.today().catch(() => Math.floor(Date.now() / 86400000));
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  await document.fonts.ready;
  g.fillStyle = '#FBF3E8'; g.fillRect(0, 0, c.width, c.height);
  const round = (x, y, w, h, r, fill, shadow) => {
    g.save();
    if (shadow) { g.shadowColor = 'rgba(90,62,54,.22)'; g.shadowBlur = 40; g.shadowOffsetY = 18; }
    g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); g.restore();
  };
  round(60, 60, 960, 1230, 70, '#F4A7B9', true);   // clay frame
  round(84, 84, 912, 1182, 54, '#FFF8EE');
  const img = await loadImage(lookURL(recipe, { seed: 1 }));
  g.save(); g.beginPath(); g.roundRect(130, 130, 820, 1025 * 0.82, 40); g.clip();
  g.drawImage(img, 130, 130, 820, 1025); g.restore();
  g.fillStyle = '#5A3E36'; g.textAlign = 'center';
  const name = $('#lookName').value.trim();
  g.font = '700 58px Fredoka, sans-serif';
  g.fillText(name || 'My clay cutie', 540, 1080 + 50 - 20);
  g.font = '600 32px Nunito, sans-serif';
  g.fillStyle = '#8A6A5F';
  g.fillText(`Look of the Day: “${themeOf(day)}”`, 540, 1160);
  g.font = '700 30px Fredoka, sans-serif'; g.fillStyle = '#FF85A2';
  g.fillText("Jane's Closet · made on BOT Chain", 540, 1220);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], `janes-closet-${(name || 'look').replace(/\W+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ files: [file], title: "My Jane's Closet look" }); return; } catch { /* fall back to download */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  say('Say cheese!');
}
$('#photo').addEventListener('click', () => photoCard().catch((e) => { console.error(e); toast('Could not make the photo — try again.', 'error'); }));

// ---------------------------------------------------------------- save + enter
const nameInput = $('#lookName');
nameInput.addEventListener('input', () => {
  const p = nameProblem(nameInput.value);
  $('#nameNote').textContent = p || `${nameInput.value.length}/20 · only the outfit recipe + name go on-chain.`;
  $('#nameNote').classList.toggle('bad', !!p);
});

async function save() {
  const name = nameInput.value.trim();
  const p = nameProblem(name);
  if (p) { toast(p, 'error'); nameInput.focus(); return; }
  const snapshot = JSON.parse(JSON.stringify(recipe));
  try {
    const id = await withTx('Saving…', (onSent) => api.saveLook(snapshot, name, onSent));
    lastSaved = { id, name };
    say('Ooh la la! Saved!');
    showSaved();
  } catch { /* toast already shown */ }
}
async function showSaved() {
  const box = $('#saved');
  if (!lastSaved) { box.hidden = true; return; }
  box.hidden = false;
  const label = lastSaved.id != null ? `Look #${lastSaved.id}` : 'Your look';
  let enterBtn = `<button type="button" class="clay-btn mint small" id="enterNow" style="width:100%">🎟️ Enter today's challenge</button>`;
  try {
    const day = await api.today();
    const mine = wallet.address ? await api.myDay(day, wallet.address) : { entered: -1 };
    if (mine.entered >= 0) enterBtn = `<p class="chip" style="background:var(--mint)">You're in today! Come back to vote 🗳️</p>`;
  } catch { /* keep the button */ }
  box.innerHTML = `<p style="margin-bottom:10px"><b>✨ ${label} saved to your closet.</b></p>${enterBtn}<a class="clay-btn small" style="width:100%;margin-top:8px" href="${ROOT}closet/">Open my closet</a>`;
  $('#enterNow')?.addEventListener('click', async () => {
    try {
      await withTx('Entering…', (onSent) => api.enter(lastSaved.id, onSent));
      toast("🎉 You're in! Come back to vote.");
      showSaved();
    } catch { /* toast already shown */ }
  });
}
$('#save').addEventListener('click', save);
$('#floatSave').addEventListener('click', () => {
  $('#savePanel').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
  setTimeout(() => nameInput.focus({ preventScroll: true }), 400);
});

// ---------------------------------------------------------------- go
api.today().then((d) => { $('#theme').textContent = `“${themeOf(d)}”`; }).catch(() => { $('#theme').textContent = `“${themeOf(Math.floor(Date.now() / 86400000))}”`; });
bus.addEventListener('wallet', showSaved);
renderTabs();
renderItems();
renderCutieControls();
render();
setTimeout(() => say('Bonjour, darling! Let\'s get you dressed.'), 700);
if (COUNTS.hair !== TABS[0].count) console.warn('hair count mismatch');
