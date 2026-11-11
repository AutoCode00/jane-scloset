// The studio crew, drawn as clay SVG: Miss Button (host), Thimble (assistant) and the judges.
// They use the page-wide clay filter #clayDom (added once by common.js).
import { clayFilter } from './art.js';

const INK = '#3B2620';
const g = (s) => `<g filter="url(#clayDom)">${s}</g>`;
const svg = (body, vb = '0 0 200 220', cls = '') => `<svg class="char ${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
const C = (x, y, r, f, e = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${e}/>`;
const E = (x, y, rx, ry, f, e = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${e}/>`;
const P = (d, f, e = '') => `<path d="${d}" fill="${f}" ${e}/>`;
const L = (d, s, w) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const eyes = (y = 0, x1 = 84, x2 = 116, r = 6) => C(x1, y, r, INK) + C(x2, y, r, INK) + C(x1 + 2, y - 2, 2, '#fff') + C(x2 + 2, y - 2, 2, '#fff');
const cheeks = (y, x1 = 70, x2 = 130) => E(x1, y, 9, 6, '#FF8FA8', 'opacity=".6"') + E(x2, y, 9, 6, '#FF8FA8', 'opacity=".6"');

/** Defs to include once per page. */
export const clayDefs = () =>
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${clayFilter('clayDom', 4, { wobble: 4 })}${clayFilter('clayDom2', 9, { wobble: 4 })}${clayFilter('clayDom3', 15, { wobble: 4 })}</defs></svg>`;

export function missButton() {
  const lilac = '#C9A7EB', fluff = '#D9BFF3';
  const puffs = (pts, f) => pts.map(([x, y, r]) => C(x, y, r, f)).join('');
  return svg(g(
    // body + legs
    puffs([[100, 178, 40], [74, 196, 22], [126, 196, 22], [80, 210, 14], [120, 210, 14]], lilac) +
    // arm with pincushion bracelet
    L('M134 160 L160 132', lilac, 18) + C(160, 128, 13, fluff) + C(146, 146, 9, '#E8475F') + L('M142 140 L138 132 M150 140 L154 132 M146 138 L146 129', '#7A7A7A', 2) + C(138, 131, 2.5, '#F7D46B') + C(154, 131, 2.5, '#A7D3F2') + C(146, 128, 2.5, '#FFF') +
    L('M66 160 L52 190', lilac, 18) + C(52, 192, 11, fluff) +
    // ears
    puffs([[52, 96, 20], [48, 120, 18], [54, 142, 15], [148, 96, 20], [152, 120, 18], [146, 142, 15]], fluff) +
    // head + topknot
    C(100, 100, 50, lilac) + puffs([[100, 46, 22], [80, 54, 16], [120, 54, 16], [100, 30, 14]], fluff) +
    // snout + nose
    E(100, 124, 22, 16, '#E7D3FA') + E(100, 114, 9, 6, INK) +
    L('M92 130 Q100 138 108 130', INK, 3) +
    eyes(96, 80, 120, 5.5) + cheeks(116, 66, 134) +
    // cat-eye glasses
    `<path d="M62 92 Q66 80 82 84 Q96 86 96 96 Q94 108 80 108 Q64 106 62 92Z M138 92 Q134 80 118 84 Q104 86 104 96 Q106 108 120 108 Q136 106 138 92Z" fill="#fff" fill-opacity=".18" stroke="#FF85A2" stroke-width="5"/>` +
    L('M62 90 L54 80 M138 90 L146 80 M96 94 L104 94', '#FF85A2', 5) +
    // measuring tape around the neck
    P('M64 146 Q100 166 136 146 L138 156 Q100 176 62 156Z', '#FF9DB4') + L('M74 154 L74 159 M86 158 L86 163 M98 160 L98 165 M110 159 L110 164 M122 156 L122 161', INK, 1.6) +
    P('M90 160 L80 200 L90 202 L98 164Z', '#FF9DB4') + P('M108 160 L116 196 L106 198 L102 164Z', '#FF9DB4') + L('M84 178 L91 179 M86 188 L92 189 M108 178 L112 177', INK, 1.6)
  ));
}

export function thimble({ hanger = true, sign = '' } = {}) {
  const grey = '#D9C9CF';
  return svg(g(
    L('M138 170 Q176 172 168 140 Q162 120 178 112', '#F4A7B9', 5) +
    E(100, 160, 42, 38, grey) + C(70, 84, 26, grey) + C(130, 84, 26, grey) + C(70, 84, 15, '#F4A7B9') + C(130, 84, 15, '#F4A7B9') +
    C(100, 112, 38, grey) + C(100, 126, 7, '#FF85A2') + eyes(108, 86, 114, 5) + cheeks(122, 76, 124) +
    L('M84 128 L66 124 M84 132 L64 134 M116 128 L134 124 M116 132 L136 134', '#9C8A90', 1.6) +
    E(78, 196, 14, 8, grey) + E(122, 196, 14, 8, grey) +
    (hanger ? L('M100 140 L100 128 Q100 120 108 122', '#B08C6A', 4) + P('M60 156 L100 140 L140 156Z', 'none', 'stroke="#B08C6A" stroke-width="5" stroke-linejoin="round"') + P('M66 158 L134 158 L140 196 L60 196Z', '#FF85A2') : '') +
    (sign ? `<rect x="40" y="150" width="120" height="44" rx="12" fill="#FFF8EE"/>` : '')
  ) + (sign ? `<text x="100" y="179" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="20" fill="${INK}">${sign}</text>` : ''));
}

export function peaches() {
  const pink = '#F7B6C2';
  return svg(g(
    E(100, 176, 46, 36, pink) + P('M52 64 L66 100 L84 76Z', pink) + P('M148 64 L134 100 L116 76Z', pink) +
    C(100, 110, 52, pink) + E(100, 126, 22, 15, '#F48FA3') + E(92, 126, 4, 6, '#B85A6E') + E(108, 126, 4, 6, '#B85A6E') +
    eyes(98, 80, 120) + cheeks(118, 62, 138) + L('M92 146 Q100 152 108 146', INK, 3)
  ));
}

export function clover() {
  const white = '#FFF6EE';
  return svg(g(
    E(100, 178, 42, 34, white) + E(74, 52, 15, 46, white) + E(126, 52, 15, 46, white) + E(74, 56, 7, 34, '#FFB8C8') + E(126, 56, 7, 34, '#FFB8C8') +
    C(100, 116, 48, white) + E(100, 128, 6, 4, '#FF85A2') + L('M94 136 Q100 142 106 136', INK, 3) +
    eyes(108, 82, 118) + cheeks(126, 66, 134) + C(140, 196, 12, white)
  ));
}

export function sprout() {
  const green = '#A8E6CF';
  return svg(g(
    E(100, 178, 46, 34, green) + C(70, 70, 24, green) + C(130, 70, 24, green) + C(70, 70, 13, '#fff') + C(130, 70, 13, '#fff') +
    E(100, 116, 58, 44, green) + C(70, 70, 7, INK) + C(130, 70, 7, INK) + C(72, 68, 2, '#fff') + C(132, 68, 2, '#fff') +
    L('M66 124 Q100 152 134 124', '#3E7F64', 4) + cheeks(118, 58, 142) + C(100, 60, 0, green) +
    P('M96 40 Q100 22 112 26 Q108 40 96 40Z', '#7BC48F')
  ));
}

export const CREW = {
  missButton: { name: 'Miss Button', emoji: '🐩', role: 'Host & stylist', line: '"Ooh la la! Every look tells a story, darling."', draw: missButton },
  thimble: { name: 'Thimble', emoji: '🐭', role: 'Wardrobe assistant', line: '"Hangers? Got \'em. Ballot box? Got it. Snacks? …Working on it."', draw: () => thimble() },
  peaches: { name: 'Peaches', emoji: '🐷', role: 'Judge · colour queen', line: '"If it\'s pink, it\'s a ten. Those are the rules."', draw: peaches },
  clover: { name: 'Clover', emoji: '🐰', role: 'Judge · accessory expert', line: '"A bow is never too big. Never."', draw: clover },
  sprout: { name: 'Sprout', emoji: '🐸', role: 'Judge · vibe checker', line: '"Ribbit. That\'s frog for \'slay\'."', draw: sprout },
};
