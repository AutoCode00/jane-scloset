import { shell, $, esc, themeOf, untilNextDay, reducedMotion, clayWord, dayLabel, fmt } from './common.js';
import { api, bus } from './chain.js';
import { CREW, missButton } from './characters.js';
import { lookURL, lookImg, COLOURS } from './art.js';
import { emptyRecipe, decodeRecipe } from './recipe.js';
import { TABS, itemPreview } from './wardrobe.js';

await shell('home');
$('.slay').innerHTML = clayWord('slay.');

// ---------------------------------------------------------------- 1 · hero set
const base = { ...emptyRecipe(), skin: 2, hair: 6, hairColour: 3 };
const OUTFITS = [
  { ...base, top: 5, topColour: 4, bottom: 3, bottomColour: 2, shoes: 3, shoesColour: 1, acc: [1, 0, 0], accColour: [1, 0, 0] },
  { ...base, dress: 6, dressColour: 2, shoes: 6, shoesColour: 5, acc: [12, 0, 0], accColour: [0, 0, 0] },
  { ...base, top: 4, topColour: 3, bottom: 4, bottomColour: 3, shoes: 1, shoesColour: 0, acc: [11, 0, 0], accColour: [1, 0, 0] },
  { ...base, dress: 3, dressColour: 5, shoes: 4, shoesColour: 0, acc: [2, 5, 0], accColour: [0, 1, 0] },
];
const cutieImg = new Image();
cutieImg.alt = '';
cutieImg.src = lookURL(OUTFITS[0], { stage: false });
$('#heroCutie').append(cutieImg);
OUTFITS.forEach((o) => { new Image().src = lookURL(o, { stage: false }); }); // warm the cache

const hanger = (c) => `<g filter="url(#clayDom)"><path d="M0 -14 q0 -8 6 -8" fill="none" stroke="#B08C6A" stroke-width="3"/><path d="M-26 6 L0 -6 L26 6Z" fill="none" stroke="#B08C6A" stroke-width="4" stroke-linejoin="round"/><path d="M-22 8 L22 8 L28 52 L-28 52Z" fill="${c}"/></g>`;
$('#heroRack').innerHTML = `<svg class="char" viewBox="0 0 220 220" aria-hidden="true">
  <g filter="url(#clayDom)"><rect x="18" y="36" width="10" height="160" rx="5" fill="#E3B38F"/><rect x="192" y="36" width="10" height="160" rx="5" fill="#E3B38F"/><rect x="10" y="30" width="200" height="12" rx="6" fill="#E3B38F"/>
  <ellipse cx="23" cy="200" rx="18" ry="8" fill="#C98A62"/><ellipse cx="197" cy="200" rx="18" ry="8" fill="#C98A62"/></g>
  ${[0, 1, 2, 3].map((i) => `<g transform="translate(${52 + i * 40} 58)">${hanger(COLOURS[(i * 2 + 1) % 6])}</g>`).join('')}
</svg>`;
$('#heroButton').innerHTML = `<div class="boil">${missButton()}</div>`;

if (!reducedMotion && window.gsap) {
  const tl = gsap.timeline();
  tl.fromTo('#heroRack', { left: '110%' }, { left: '56%', duration: 2.2, ease: 'steps(14)' }, 0.2)
    .fromTo('#heroButton', { left: '125%' }, { left: '77%', duration: 2.2, ease: 'steps(14)' }, 0.2)
    .fromTo('#heroCutie', { scaleY: 0.9, scaleX: 1.08 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'steps(6)' }, 0);
  let n = 0;
  const spin = () => {
    n = (n + 1) % OUTFITS.length;
    gsap.timeline()
      .to('#heroCutie', { scaleX: 0, duration: 0.25, ease: 'steps(3)' })
      .add(() => { cutieImg.src = lookURL(OUTFITS[n], { stage: false }); })
      .to('#heroCutie', { scaleX: 1, duration: 0.25, ease: 'steps(3)' })
      .fromTo('#heroCutie', { scaleY: 0.92 }, { scaleY: 1, duration: 0.45, ease: 'steps(6)' });
  };
  // three outfit changes in a row, a pause, repeat
  gsap.timeline({ repeat: -1, delay: 2.6, repeatDelay: 2.2 }).call(spin).call(spin, null, '+=1.3').call(spin, null, '+=1.3').call(spin, null, '+=1.3');
} else {
  $('#heroRack').style.left = '56%';
  $('#heroButton').style.left = '77%';
}

// ---------------------------------------------------------------- 2 · crew
$('#crewGrid').innerHTML = Object.values(CREW).map((c, i) => `
  <article class="panel crew-card">
    <div class="char-box boil" style="animation-delay:-${i * 0.11}s">${c.draw()}</div>
    <h3>${c.name} ${c.emoji}</h3>
    <div class="role">${c.role}</div>
    <p>${esc(c.line)}</p>
  </article>`).join('');

// ---------------------------------------------------------------- 3 · today's theme
$('#todayButton').innerHTML = missButton();
setInterval(() => { $('#countdown').textContent = untilNextDay(); }, 1000);
$('#countdown').textContent = untilNextDay();
async function loadToday() {
  try {
    const day = await api.today();
    $('#themeName').textContent = `“${themeOf(day)}”`;
    const info = await api.dayInfo(day);
    $('#entryCount').textContent = fmt(info.entries.length);
  } catch (e) {
    console.warn(e);
    $('#themeName').textContent = `“${themeOf(Math.floor(Date.now() / 86400000))}”`;
  }
}

// ---------------------------------------------------------------- 4 · wardrobe shelf
const shelfOrder = ['hair', 'dress', 'top', 'bottom', 'shoes', 'acc', 'sticker', 'background'];
const sample = { hair: 4, dress: 2, top: 10, bottom: 6, shoes: 8, acc: 10, sticker: 3, background: 3 };
$('#shelf').innerHTML = shelfOrder.map((key, i) => {
  const t = TABS.find((x) => x.key === key);
  return `<a class="panel shelf-item" href="studio/?tab=${key}">
    <div class="thumb">${itemPreview(t, sample[key], (i + 1) % 6)}</div>
    <b>${t.ico} ${t.label === 'Sets' ? 'Backgrounds' : t.label === 'Extras' ? 'Accessories' : t.label}</b>
    <span>${t.count} ${key === 'background' ? 'clay sets' : 'pieces'}${t.colours ? ' · 6 colours' : ''}</span>
  </a>`;
}).join('');

// ---------------------------------------------------------------- 5 · winners
async function loadWinners() {
  const grid = $('#winnersGrid');
  try {
    const wins = await api.recentWinners(8);
    if (!wins.length) {
      grid.innerHTML = `<div class="panel empty" style="grid-column:1/-1"><div class="char-box boil">${missButton()}</div><h3>No crowns yet!</h3><p>The first winner is crowned when the first day ends. Be the first to strut!</p><a class="clay-btn pink" href="challenge/">Enter today</a></div>`;
      return;
    }
    grid.replaceChildren(...wins.map((w) => {
      const card = document.createElement('article');
      card.className = 'panel winner-card';
      card.innerHTML = `<span class="crown" aria-hidden="true">👑</span>`;
      card.append(lookImg(decodeRecipe(w.look.recipe), `Winning look “${w.look.name}”`));
      card.insertAdjacentHTML('beforeend', `<h4>${esc(w.look.name || 'Untitled look')}</h4><p>${esc(themeOf(w.day))} · ${dayLabel(w.day)}</p>`);
      return card;
    }));
  } catch (e) {
    console.warn(e);
    grid.innerHTML = '<p class="muted center" style="grid-column:1/-1">Couldn’t reach BOT Chain just now — the winners will show up when it’s back.</p>';
  }
}

loadToday();
loadWinners();
bus.addEventListener('data', () => { loadToday(); loadWinners(); });
