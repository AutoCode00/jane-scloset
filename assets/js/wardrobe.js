// The wardrobe catalog: tabs, items and small clay previews for the item grid.
import { HAIR, TOPS, BOTTOMS, DRESSES, SHOES, ACCESSORIES, STICKERS, BACKGROUNDS, SKIN, HAIR_COLOURS, COLOURS, lookSVG } from './art.js';
import { emptyRecipe } from './recipe.js';

const bare = () => ({ ...emptyRecipe(), top: 0, bottom: 0, dress: 0, shoes: 0, acc: [0, 0, 0], stickers: [0, 0, 0], background: 0, skin: 1, hair: 11, hairColour: 0 });

// Each tab: items (index 0 = "none" where allowed), how to apply, which viewBox to crop for previews.
export const TABS = [
  { key: 'hair', label: 'Hair', ico: '💇', count: HAIR.length, names: HAIR.map((h) => h.name), none: false, colours: HAIR_COLOURS, crop: '60 0 280 300',
    sel: (r) => r.hair, set: (r, i) => { r.hair = i; }, colour: (r) => r.hairColour, setColour: (r, c) => { r.hairColour = c; },
    preview: (i, c) => ({ ...bare(), hair: i, hairColour: c }) },
  { key: 'top', label: 'Tops', ico: '👚', count: TOPS.length, names: TOPS.map((t) => t.name), none: true, colours: COLOURS, crop: '90 230 220 150',
    sel: (r) => r.top, set: (r, i) => { r.top = i; if (i) r.dress = 0; }, colour: (r) => r.topColour, setColour: (r, c) => { r.topColour = c; },
    preview: (i, c) => ({ ...bare(), top: i, topColour: c }) },
  { key: 'bottom', label: 'Bottoms', ico: '👖', count: BOTTOMS.length, names: BOTTOMS.map((b) => b.name), none: true, colours: COLOURS, crop: '90 300 220 150',
    sel: (r) => r.bottom, set: (r, i) => { r.bottom = i; if (i) r.dress = 0; }, colour: (r) => r.bottomColour, setColour: (r, c) => { r.bottomColour = c; },
    preview: (i, c) => ({ ...bare(), bottom: i, bottomColour: c }) },
  { key: 'dress', label: 'Dresses', ico: '👗', count: DRESSES.length, names: DRESSES.map((d) => d.name), none: true, colours: COLOURS, crop: '60 230 280 230',
    sel: (r) => r.dress, set: (r, i) => { r.dress = i; if (i) { r.top = 0; r.bottom = 0; } }, colour: (r) => r.dressColour, setColour: (r, c) => { r.dressColour = c; },
    preview: (i, c) => ({ ...bare(), dress: i, dressColour: c }) },
  { key: 'shoes', label: 'Shoes', ico: '👟', count: SHOES.length, names: SHOES.map((s) => s.name), none: true, colours: COLOURS, crop: '135 360 130 100',
    sel: (r) => r.shoes, set: (r, i) => { r.shoes = i; }, colour: (r) => r.shoesColour, setColour: (r, c) => { r.shoesColour = c; },
    preview: (i, c) => ({ ...bare(), shoes: i, shoesColour: c }) },
  { key: 'acc', label: 'Extras', ico: '🎀', count: ACCESSORIES.length, names: ACCESSORIES.map((a) => a.name), none: false, multi: 3, colours: COLOURS, crop: '30 10 340 400',
    sel: (r) => r.acc, colour: (r) => r.accColour[Math.max(0, r.acc.findLastIndex((a) => a))] ?? 0,
    setColour: (r, c) => { const i = r.acc.findLastIndex((a) => a); if (i >= 0) r.accColour[i] = c; },
    preview: (i, c) => ({ ...bare(), hair: 0, acc: [i, 0, 0], accColour: [c, 0, 0] }) },
  { key: 'sticker', label: 'Stickers', ico: '⭐', count: STICKERS.length, names: STICKERS.map((s) => s.name), none: false, multi: 3, colours: null, crop: null,
    sel: (r) => r.stickers },
  { key: 'background', label: 'Sets', ico: '🏞️', count: BACKGROUNDS.length, names: BACKGROUNDS.map((b) => b.name), none: false, colours: null, crop: '0 0 400 500',
    sel: (r) => r.background, set: (r, i) => { r.background = i; } },
];

export const SKIN_TAB = { colours: SKIN };

/** Inline SVG preview of one item (uses the page clay filter #clayDom). */
export function itemPreview(tab, i, colourIdx = 0) {
  if (tab.key === 'sticker') {
    return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><g filter="url(#clayDom)">${STICKERS[i - 1].draw(40, 42)}</g></svg>`;
  }
  if (tab.key === 'background') {
    return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><g filter="url(#clayDom)">${BACKGROUNDS[i].draw()}</g></svg>`;
  }
  const r = tab.preview(i, colourIdx);
  // no background or pedestal; filters point at the page-wide clay filter
  const inner = lookSVG(r, { plain: true, stage: false })
    .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<defs>[\s\S]*?<\/defs>/, '');
  return `<svg viewBox="${tab.crop}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${inner.replace(/url\(#claybg\)/g, 'url(#clayDom)')}</svg>`;
}
