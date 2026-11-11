import { shell, $, $$, esc, toast, withTx, themeOf, untilNextDay, reducedMotion, dayLabel, fmt, ROOT } from './common.js';
import { api, wallet, bus, connect, short, MODE } from './chain.js';
import { lookImg } from './art.js';
import { decodeRecipe } from './recipe.js';
import { missButton, thimble, peaches, clover, sprout } from './characters.js';
import { CONFIG } from './config.js';

await shell('challenge');
$('#host').innerHTML = missButton();

let today = 0;
let info = { entries: [], finalized: false, leader: -1 };
let mine = { entered: -1, voted: -1 };
let view = location.hash === '#results' ? 'results' : 'duel';
let resultsDay = 0;
let duelPair = [];

// ---------------------------------------------------------------- loading
async function load() {
  try {
    const t = await api.today();
    if (t !== today) { today = t; resultsDay = t - 1; duelPair = []; } // first load, or a new UTC day began
    info = await api.dayInfo(today);
    mine = wallet.address ? await api.myDay(today, wallet.address) : { entered: -1, voted: -1 };
  } catch (e) {
    console.warn(e);
    $('#status').innerHTML = `<p>Couldn’t reach BOT Chain just now. Check your connection and refresh.</p>`;
    return;
  }
  $('#theme').textContent = themeOf(today);
  $('#dayDate').textContent = dayLabel(today);
  $('#entryCount').textContent = fmt(info.entries.length);
  $('#voteCount').textContent = fmt(info.entries.reduce((a, e) => a + e.votes, 0));
  renderStatus();
  renderView();
}
setInterval(() => { $('#countdown').textContent = untilNextDay(); }, 1000);
$('#countdown').textContent = untilNextDay();

// ---------------------------------------------------------------- status card
function renderStatus() {
  const s = $('#status');
  let html;
  if (!wallet.address) {
    html = `<div class="char-box">${thimble()}</div><div><h3>Want to play?</h3><p>Connect your wallet to enter a look and vote. Browsing is free.</p><button type="button" class="clay-btn pink small" data-act="connect">Connect wallet</button></div>`;
  } else if (mine.entered >= 0) {
    const e = info.entries.find((x) => x.id === mine.entered);
    html = `<div class="char-box">${missButton()}</div><div><h3>You're in! 🎉</h3><p>Your look “${esc(e?.name || 'Untitled')}” has <b>${e?.votes ?? 0}</b> vote${e?.votes === 1 ? '' : 's'} so far. ${mine.voted >= 0 ? "You've voted too — now we wait for midnight UTC!" : 'Come back to vote for your favourite!'}</p></div>`;
  } else {
    html = `<div class="char-box">${missButton()}</div><div><h3>Enter today's challenge</h3><p>Pick one of your saved looks that fits “${esc(themeOf(today))}”.</p><button type="button" class="clay-btn pink small" data-act="enter">🎟️ Enter with a saved look</button></div>`;
  }
  s.innerHTML = html;
}
$('#status').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  try {
    if (act === 'connect') await connect();
    if (act === 'enter') await openPicker();
  } catch (err) { toast(err.message, 'error'); }
});

// ---------------------------------------------------------------- entering: pick a saved look
async function openPicker() {
  if (!wallet.address) await connect();
  const looks = await api.looksOf(wallet.address);
  $('#pickTheme').textContent = themeOf(today);
  const grid = $('#pickGrid');
  if (!looks.length) {
    grid.innerHTML = `<p style="grid-column:1/-1">Your closet is empty! Style a look in the studio and save it first.</p>`;
  } else {
    grid.replaceChildren(...looks.slice().reverse().map((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item';
      b.append(lookImg(decodeRecipe(l.recipe), l.name));
      b.insertAdjacentHTML('beforeend', `<span>#${l.id} ${esc(l.name || 'Untitled')}</span>`);
      b.addEventListener('click', async () => {
        $('#picker').close();
        try {
          await withTx('Entering…', (onSent) => api.enter(l.id, onSent));
          toast("🎉 You're in! Come back to vote.");
        } catch { /* toast shown */ }
      });
      return b;
    }));
  }
  $('#picker').showModal();
}
$('#pickClose').addEventListener('click', () => $('#picker').close());

// ---------------------------------------------------------------- views
$('#vote').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (!b) return;
  view = b.dataset.view;
  renderView();
});

function renderView() {
  $$('#vote [data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  if (view === 'duel') renderDuel();
  else if (view === 'grid') renderGrid();
  else renderResults();
}

const isMine = (e) => wallet.address && e.owner.toLowerCase() === wallet.address.toLowerCase();

function entryCard(e, { showVote = true } = {}) {
  const card = document.createElement('article');
  card.className = `panel entry${isMine(e) ? ' mine' : ''}${mine.voted === e.id ? ' picked' : ''}`;
  card.append(lookImg(decodeRecipe(e.recipe), `Look “${e.name}”`));
  let btn = '';
  if (showVote) {
    if (isMine(e)) btn = `<span class="chip" style="background:var(--lilac)">Your look</span>`;
    else if (mine.voted === e.id) btn = `<span class="chip" style="background:var(--pink)">💖 Your pick</span>`;
    else if (mine.voted < 0) btn = `<button type="button" class="clay-btn pink small" data-vote="${e.id}">Vote for this</button>`;
  }
  card.insertAdjacentHTML('beforeend', `<h4>${esc(e.name || 'Untitled look')}</h4><p class="by">by ${short(e.owner)}${e.sample ? ' · sample' : ''}</p><p class="votes">🗳️ ${e.votes} vote${e.votes === 1 ? '' : 's'}</p>${btn}`);
  return card;
}

function noEntries() {
  return `<div class="panel empty"><div class="char-box boil">${missButton()}</div><h3>Be the first to strut!</h3><p>No entries yet today. Style a look that fits “${esc(themeOf(today))}” and enter it.</p><a class="clay-btn pink" href="${ROOT}studio/">👗 Start styling</a></div>`;
}

function pickPair() {
  const pool = info.entries.filter((e) => !isMine(e));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  duelPair = shuffled.slice(0, 2).map((e) => e.id);
}

function renderDuel() {
  const v = $('#view');
  if (!info.entries.length) { v.innerHTML = noEntries(); return; }
  if (mine.voted >= 0) {
    const pick = info.entries.find((e) => e.id === mine.voted);
    v.innerHTML = `<h2 class="center" style="font-size:30px">You voted! 💖</h2><p class="center muted">One vote per day. Here's your pick — results after midnight UTC.</p>`;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:300px;margin:20px auto';
    if (pick) wrap.append(entryCard(pick));
    v.append(wrap);
    return;
  }
  if (duelPair.length < 2 || duelPair.some((id) => !info.entries.find((e) => e.id === id))) pickPair();
  const pair = duelPair.map((id) => info.entries.find((e) => e.id === id)).filter(Boolean);
  if (pair.length < 2) {
    v.innerHTML = `<p class="center">Not enough other looks to compare yet — check the <b>All entries</b> tab, or come back when more cuties have entered.</p>`;
    return;
  }
  v.innerHTML = `<h2 class="center" style="font-size:30px">Which fits “${esc(themeOf(today))}” better?</h2>`;
  const duel = document.createElement('div');
  duel.className = 'duel';
  duel.append(entryCard(pair[0]));
  duel.insertAdjacentHTML('beforeend', '<span class="vs" aria-hidden="true">vs</span>');
  duel.append(entryCard(pair[1]));
  v.append(duel);
  v.insertAdjacentHTML('beforeend', `<p class="center" style="margin-top:20px"><button type="button" class="clay-btn small" id="shuffle">🔀 Show me two others</button></p>`);
  $('#shuffle').addEventListener('click', () => { pickPair(); renderDuel(); });
}

function renderGrid() {
  const v = $('#view');
  if (!info.entries.length) { v.innerHTML = noEntries(); return; }
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(...info.entries.map((e) => entryCard(e)));
  v.replaceChildren(grid);
}

$('#view').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-vote]');
  if (!b) return;
  const id = Number(b.dataset.vote);
  try {
    await withTx('Voting…', (onSent) => api.vote(today, id, onSent));
    toast('💖 Vote counted! Thimble popped it in the ballot box.');
  } catch { /* toast shown */ }
});

// ---------------------------------------------------------------- results
const FINALIZE_KEY = (d) => `${CONFIG.storageKey}.finalizeTried.${d}`;

async function renderResults() {
  const v = $('#view');
  v.innerHTML = '<div class="look-thumb is-loading" style="max-width:220px;margin:40px auto"></div>';
  let r;
  try { r = await api.dayInfo(resultsDay); } catch { v.innerHTML = '<p class="center">Couldn’t load the results. Try again soon.</p>'; return; }
  const dayChips = Array.from({ length: 7 }, (_, i) => today - 1 - i)
    .map((d) => `<button type="button" class="clay-btn small ${d === resultsDay ? 'pink' : ''}" data-day="${d}">${dayLabel(d)}</button>`).join('');
  const head = `<h2 class="center" style="font-size:30px">Results · “${esc(themeOf(resultsDay))}”</h2><p class="center muted">${dayLabel(resultsDay)} · ${r.entries.length} entr${r.entries.length === 1 ? 'y' : 'ies'}</p>`;
  const days = `<div class="past-days">${dayChips}</div>`;

  if (!r.entries.length) {
    v.innerHTML = head + `<div class="panel empty" style="max-width:520px;margin:20px auto"><div class="char-box">${missButton()}</div><h3>Nobody strutted that day</h3><p>No entries, so no crown. Today's a new chance!</p></div>` + days;
    return;
  }

  if (!r.finalized) {
    v.innerHTML = head + `<div class="panel status-card"><div class="char-box">${thimble()}</div><div><h3>Counting votes…</h3><p>Thimble is emptying the ballot box. The crown goes on-chain with one small transaction — anyone can do it.</p><button type="button" class="clay-btn pink small" id="crownBtn">👑 Crown the winner</button></div></div>` + days;
    $('#crownBtn').addEventListener('click', () => finalize(resultsDay));
    // Automatically ask once per day per browser, only if a wallet is already connected.
    let tried = false;
    try { tried = !!localStorage.getItem(FINALIZE_KEY(resultsDay)); localStorage.setItem(FINALIZE_KEY(resultsDay), '1'); } catch { /* ignore */ }
    if (wallet.address && !tried) finalize(resultsDay);
    return;
  }

  // podium: sort by votes, ties → earlier entry (entry order)
  const ranked = r.entries.map((e, i) => ({ ...e, pos: i })).sort((a, b) => b.votes - a.votes || a.pos - b.pos);
  const top = ranked.slice(0, 3);
  v.innerHTML = head;
  const podium = document.createElement('div');
  podium.className = 'podium';
  const order = [1, 0, 2];
  for (const idx of order) {
    const e = top[idx];
    const spot = document.createElement('div');
    spot.className = `spot p${idx + 1}`;
    if (e) {
      if (idx === 0) spot.insertAdjacentHTML('beforeend', '<span class="crown-drop" aria-hidden="true">👑</span>');
      spot.append(lookImg(decodeRecipe(e.recipe), `Look “${e.name}”, place ${idx + 1}`));
      spot.insertAdjacentHTML('beforeend', `<h4 style="margin:8px 0 0">${esc(e.name || 'Untitled')}</h4><p class="by" style="margin:0;font-size:13px">${short(e.owner)} · ${e.votes} vote${e.votes === 1 ? '' : 's'}</p>`);
    }
    spot.insertAdjacentHTML('beforeend', `<div class="block">${idx + 1}</div>`);
    podium.append(spot);
  }
  v.append(podium);

  // the judges hold up (just-for-fun) score cards
  const seed = (n) => 7 + ((resultsDay * 7 + n * 13) % 4);
  const judges = document.createElement('div');
  judges.className = 'judges';
  judges.innerHTML = [peaches, clover, sprout].map((f, i) => `<div class="judge"><div class="char-box boil" style="animation-delay:-${i * 0.1}s">${f()}</div><span class="score">${seed(i) === 10 ? '10!' : seed(i)}</span></div>`).join('');
  v.append(judges);
  v.insertAdjacentHTML('beforeend', `<p class="center muted" style="font-size:14px;margin-top:10px">The judges' cards are just for fun — the crown goes to the most votes.</p>` + days);
  celebrate();
}

$('#view').addEventListener('click', (e) => {
  const d = e.target.closest('[data-day]');
  if (!d) return;
  resultsDay = Number(d.dataset.day);
  renderResults();
});

async function finalize(day) {
  try {
    await withTx('Crowning…', (onSent) => api.finalize(day, onSent));
    toast('👑 The crown has landed!');
  } catch (e) {
    if (e.code === 'AlreadyFinalized') renderResults();
  }
}

function celebrate() {
  const scores = $$('.score');
  const crown = $('.crown-drop');
  if (reducedMotion || !window.gsap) { scores.forEach((s) => s.classList.add('up')); return; }
  scores.forEach((s, i) => setTimeout(() => s.classList.add('up'), 500 + i * 450));
  if (crown) gsap.fromTo(crown, { y: -160, scaleY: 1 }, { y: 0, duration: 0.7, delay: 1.9, ease: 'steps(8)', onComplete: () => gsap.fromTo(crown, { scaleY: 0.7, scaleX: 1.3 }, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'steps(5)' }) });
  setTimeout(confetti, 2300);
}
function confetti() {
  const box = document.createElement('div');
  box.className = 'confetti';
  const colours = ['#FF85A2', '#C9A7EB', '#A7D3F2', '#A8E6CF', '#FFE29A', '#FFC4A3'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colours[i % colours.length];
    box.append(p);
    gsap.to(p, { y: innerHeight + 60, x: (Math.random() - 0.5) * 160, rotation: Math.random() * 360, duration: 1.8 + Math.random() * 1.4, delay: Math.random() * 0.6, ease: 'steps(16)' });
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 4200);
}

// ---------------------------------------------------------------- go
bus.addEventListener('wallet', load);
bus.addEventListener('data', load);
await load();
if (MODE === 'live') setInterval(() => { if (!document.hidden && !$('.tx-pending')) load(); }, 30000);
