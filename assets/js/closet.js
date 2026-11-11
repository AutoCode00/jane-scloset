import { shell, $, esc, toast, themeOf, dayLabel, fmt, ROOT } from './common.js';
import { api, wallet, bus, connect } from './chain.js';
import { lookImg } from './art.js';
import { decodeRecipe } from './recipe.js';
import { thimble } from './characters.js';

await shell('closet');

async function load() {
  const box = $('#closet');
  if (!wallet.address) {
    $('#closetStats').innerHTML = '';
    $('#history').innerHTML = '';
    box.innerHTML = `<div class="panel empty" style="max-width:560px;margin:0 auto"><div class="char-box">${thimble()}</div><h3>Your closet is locked 🔒</h3><p>Connect your wallet to see the looks you saved on BOT Chain.</p><button type="button" class="clay-btn pink" id="closetConnect">Connect wallet</button></div>`;
    $('#closetConnect').addEventListener('click', () => connect().catch((e) => toast(e.message, 'error')));
    return;
  }
  let looks, crowns, today;
  try {
    [looks, crowns, today] = await Promise.all([api.looksOf(wallet.address), api.crowns(wallet.address), api.today()]);
  } catch (e) {
    console.warn(e);
    box.innerHTML = '<p>Couldn’t reach BOT Chain just now. Try again in a moment.</p>';
    return;
  }

  // challenge history: last 14 days
  const days = Array.from({ length: 14 }, (_, i) => today - i);
  const rows = (await Promise.all(days.map(async (d) => {
    const my = await api.myDay(d, wallet.address).catch(() => ({ entered: -1 }));
    if (my.entered < 0) return null;
    const info = await api.dayInfo(d);
    const entry = info.entries.find((e) => e.id === my.entered);
    const won = info.finalized && info.leader === my.entered;
    return { d, entry, won, open: d === today, finalized: info.finalized, rank: info.entries.slice().sort((a, b) => b.votes - a.votes).findIndex((e) => e.id === my.entered) + 1, total: info.entries.length };
  }))).filter(Boolean);

  $('#closetStats').innerHTML = `<span class="chip" style="background:var(--pink)">👗 ${fmt(looks.length)} look${looks.length === 1 ? '' : 's'}</span><span class="chip">👑 ${fmt(crowns)} crown${crowns === 1 ? '' : 's'}</span><span class="chip" style="background:var(--mint)">🎟️ ${rows.length} recent entr${rows.length === 1 ? 'y' : 'ies'}</span>`;

  if (!looks.length) {
    box.innerHTML = `<div class="panel empty" style="max-width:560px;margin:0 auto"><div class="char-box boil">${thimble()}</div><h3>Nothing on the hangers yet</h3><p>Style your first look in the studio and hit Save look.</p><a class="clay-btn pink" href="${ROOT}studio/">👗 Start styling</a></div>`;
  } else {
    const wonIds = new Set(rows.filter((r) => r.won).map((r) => r.entry?.id));
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.append(...looks.slice().reverse().map((l) => {
      const card = document.createElement('article');
      card.className = 'panel entry';
      if (wonIds.has(l.id)) card.insertAdjacentHTML('beforeend', '<span class="crown" style="position:absolute;top:-16px;left:50%;translate:-50% 0;font-size:32px" aria-label="Crowned">👑</span>');
      card.style.position = 'relative';
      card.append(lookImg(decodeRecipe(l.recipe), `Look “${l.name}”`));
      const when = new Date(l.at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      card.insertAdjacentHTML('beforeend', `<h4>${esc(l.name || 'Untitled look')}</h4><p class="by">Look #${l.id} · ${when}</p><a class="clay-btn small" href="${ROOT}studio/?look=${l.recipe}">✏️ Restyle</a>`);
      return card;
    }));
    box.replaceChildren(grid);
  }

  $('#history').innerHTML = rows.length
    ? rows.map((r) => `<div class="panel history-row"><div><b>${esc(themeOf(r.d))}</b><br><span class="muted" style="font-size:14px">${dayLabel(r.d)} · “${esc(r.entry?.name || 'Untitled')}” · ${r.entry?.votes ?? 0} vote${r.entry?.votes === 1 ? '' : 's'}</span></div><span class="chip" style="background:${r.won ? 'var(--butter)' : r.open ? 'var(--mint)' : 'var(--cream)'}">${r.won ? '👑 Winner' : r.open ? 'Voting open' : r.finalized ? `#${r.rank} of ${r.total}` : 'Counting votes…'}</span></div>`).join('')
    : `<p class="muted">No entries in the last two weeks. <a href="${ROOT}challenge/">Enter today's challenge →</a></p>`;
}

bus.addEventListener('wallet', load);
bus.addEventListener('data', load);
load();
