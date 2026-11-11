// Clay art: every wardrobe item is a small SVG layer. A per-layer "clay" filter gives wobbly edges,
// soft puffy lighting, a highlight and fingerprint grain. Rebuilt from a recipe, layer by layer.
// Picture size: 400 × 500.

export const W = 400;
export const H = 500;

export const SKIN = ['#FFE3D3', '#FAD3BC', '#F2C09E', '#E3A47E', '#C98A62', '#A86E4B', '#87553A', '#5E3B28'];
export const HAIR_COLOURS = ['#7A4E36', '#33292A', '#F2CF7A', '#E3864B', '#F4A7B9', '#C9A7EB'];
export const HAIR_COLOUR_NAMES = ['Cocoa', 'Liquorice', 'Butter blonde', 'Ginger', 'Candy pink', 'Lilac'];
export const COLOURS = ['#F4A7B9', '#FF85A2', '#C9A7EB', '#A7D3F2', '#A8E6CF', '#FFE29A'];
export const COLOUR_NAMES = ['Clay pink', 'Bubblegum', 'Lilac', 'Baby blue', 'Mint', 'Butter'];
const INK = '#3B2620';
const CREAM = '#FFF8EE';

// ---------------------------------------------------------------- colour helpers
function mix(hex, other, t) {
  const a = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  const b = other.match(/\w\w/g).map((x) => parseInt(x, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export const dark = (hex, t = 0.25) => mix(hex, '#5A3E36', t);
export const light = (hex, t = 0.45) => mix(hex, '#FFFFFF', t);

// ---------------------------------------------------------------- the clay filter
export function clayFilter(id, seed = 1, { wobble = 5, grain = true } = {}) {
  return `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="${seed}" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="${wobble}" xChannelSelector="R" yChannelSelector="G" result="w"/>
<feGaussianBlur in="w" stdDeviation="5" result="b"/>
<feDiffuseLighting in="b" surfaceScale="6" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting>
<feComposite in="w" in2="d" operator="arithmetic" k1="0.72" k2="0.38" k3="0" k4="0" result="lit"/>
<feSpecularLighting in="b" surfaceScale="6" specularConstant="0.75" specularExponent="26" lighting-color="#fff" result="s"><feDistantLight azimuth="235" elevation="34"/></feSpecularLighting>
<feComposite in="s" in2="w" operator="in" result="s2"/>
<feGaussianBlur in="w" stdDeviation="3.5" result="sb"/>
<feOffset in="sb" dx="2" dy="5" result="so"/>
<feColorMatrix in="so" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.21  0 0 0 0.28 0" result="shadow"/>
${grain ? `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="${seed + 11}" result="g"/>
<feColorMatrix in="g" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.21  0.32 0 0 0 -0.1" result="g2"/>
<feComposite in="g2" in2="w" operator="in" result="g3"/>` : ''}
<feMerge><feMergeNode in="shadow"/><feMergeNode in="lit"/><feMergeNode in="s2"/>${grain ? '<feMergeNode in="g3"/>' : ''}</feMerge>
</filter>`;
}

// ---------------------------------------------------------------- shape helpers
const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const C = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const E = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const R = (x, y, w, h, rx, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const L = (d, stroke, w, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const mirror = (svg) => `<g transform="translate(400 0) scale(-1 1)">${svg}</g>`;
const both = (svg) => svg + mirror(svg);

function star(cx, cy, r, fill, points = 5, inner = 0.48) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
  }
  return P(d + 'Z', fill, 'stroke-linejoin="round"');
}
const heart = (cx, cy, s, fill) =>
  P(`M${cx} ${cy + s * 0.9} C${cx - s * 1.4} ${cy - s * 0.1} ${cx - s * 0.7} ${cy - s * 1.1} ${cx} ${cy - s * 0.35} C${cx + s * 0.7} ${cy - s * 1.1} ${cx + s * 1.4} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`, fill);

// ---------------------------------------------------------------- body geometry
// Head centre (200,170) r 98 · torso 150–250 x, 258–350 y · legs to y 432 · pedestal at y 446.
const TORSO = 'M152 266 Q200 248 248 266 L258 348 Q200 362 142 348 Z';
const ARM_L = 'M158 276 L130 336';
const ARM_R = 'M242 276 L270 336';

function pedestal() {
  return E(200, 470, 128, 26, '#E8B9A0') + R(72, 446, 256, 26, 6, '#E8B9A0') + E(200, 446, 128, 26, '#F6CDB6') + E(200, 446, 96, 16, '#FBDCC8');
}

function body(skin) {
  return (
    L(ARM_L, skin, 26) + L(ARM_R, skin, 26) + C(128, 340, 15, skin) + C(272, 340, 15, skin) +
    R(170, 330, 26, 104, 13, skin) + R(204, 330, 26, 104, 13, skin) +
    P(TORSO, skin)
  );
}

function head(skin, face) {
  let s = C(200, 170, 98, skin) + E(104, 182, 13, 18, skin) + E(296, 182, 13, 18, skin);
  // cheeks
  s += E(142, 212, 17, 10, '#FF8FA8', 'opacity="0.55"') + E(258, 212, 17, 10, '#FF8FA8', 'opacity="0.55"');
  const eyeDot = (x) => C(x, 186, 10, INK) + C(x + 3.5, 182, 3.2, '#fff');
  if (face === 1) {
    s += L('M150 186 Q162 197 174 186', INK, 6) + L('M226 186 Q238 197 250 186', INK, 6);
    s += L('M192 220 Q200 226 208 220', INK, 5);
  } else if (face === 2) {
    s += eyeDot(162) + L('M226 190 Q238 176 250 190', INK, 6);
    s += L('M184 216 Q200 232 216 216', INK, 5) + E(206, 226, 5, 4, '#FF6F8E');
  } else {
    s += eyeDot(162) + eyeDot(238);
    s += L('M186 216 Q200 230 214 216', INK, 5);
  }
  return s;
}

// ---------------------------------------------------------------- hair (back part, front part)
const CAP = 'M94 172 C88 92 140 58 200 58 C260 58 312 92 306 172 C300 150 290 132 276 122 Q252 138 228 120 Q206 138 184 120 Q160 138 136 120 Q110 134 94 172Z';
const CAP_SIDE = 'M94 176 C86 92 140 56 200 56 C262 56 314 94 306 176 C296 140 276 116 246 106 Q200 96 160 118 Q120 136 94 176Z';
const CAP_SLEEK = 'M96 170 C90 90 140 60 200 60 C260 60 310 90 304 170 C292 128 252 104 200 104 C148 104 108 128 96 170Z';

export const HAIR = [
  { name: 'Bob', back: (c) => P('M92 150 C92 70 308 70 308 150 L314 262 Q300 276 282 266 L118 266 Q100 276 86 262Z', c), front: (c) => P(CAP, c) },
  { name: 'Space buns', back: (c) => C(118, 84, 42, c) + C(282, 84, 42, c) + P('M96 160 C96 80 304 80 304 160 L304 220 L96 220Z', c), front: (c) => P(CAP, c) + L('M112 70 Q118 84 112 98', dark(c), 4) + L('M288 70 Q282 84 288 98', dark(c), 4) },
  { name: 'Braids', back: (c) => P('M94 150 C94 80 306 80 306 150 L306 230 L94 230Z', c) + [0, 1, 2, 3].map((i) => C(98, 236 + i * 26, 17 - i, c) + C(302, 236 + i * 26, 17 - i, c)).join('') + C(98, 344, 9, '#FF85A2') + C(302, 344, 9, '#FF85A2'), front: (c) => P('M94 176 C86 92 140 56 200 56 C260 56 314 92 306 176 C300 130 260 98 204 96 L200 110 L196 96 C140 98 100 130 94 176Z', c) },
  { name: 'Curls', back: (c) => [[100, 200], [300, 200], [96, 238], [304, 238], [110, 270], [290, 270]].map(([x, y]) => C(x, y, 26, c)).join(''), front: (c) => [[108, 140], [292, 140], [124, 102], [276, 102], [156, 76], [244, 76], [200, 66], [178, 112], [222, 112], [140, 124], [260, 124], [200, 104]].map(([x, y]) => C(x, y, 28, c)).join('') + [[124, 102], [200, 66], [276, 102]].map(([x, y]) => L(`M${x - 10} ${y} q10 -10 20 0`, dark(c, 0.2), 3)).join('') },
  { name: 'Afro puffs', back: (c) => C(104, 96, 58, c) + C(296, 96, 58, c), front: (c) => P(CAP_SLEEK, c) + L('M200 62 L200 104', dark(c, 0.18), 4) },
  { name: 'Pixie', back: () => '', front: (c) => P('M98 170 C86 86 144 54 206 56 C268 58 316 96 304 168 C300 140 288 124 270 116 C250 126 214 120 186 112 C154 128 132 120 120 128 Q106 140 98 170Z', c) + L('M150 80 Q190 70 236 84', light(c, 0.3), 5) },
  { name: 'Long waves', back: (c) => P('M90 150 C90 66 310 66 310 150 Q330 220 312 270 Q330 320 300 356 L100 356 Q70 320 88 270 Q70 220 90 150Z', c), front: (c) => P(CAP_SIDE, c) },
  { name: 'Ponytail', back: (c) => P('M290 110 Q356 130 340 220 Q330 280 352 320 Q300 300 304 230 Q306 170 280 140Z', c) + C(296, 118, 14, '#FF85A2'), front: (c) => P(CAP_SLEEK, c) + L('M130 92 Q200 70 270 96', light(c, 0.3), 5) },
  { name: 'Fluffy fringe', back: (c) => P('M94 150 C94 76 306 76 306 150 L300 236 Q200 250 100 236Z', c), front: (c) => P('M92 176 C84 90 140 54 200 54 C260 54 316 90 308 176 C302 150 292 140 280 138 Q266 150 252 136 Q238 150 222 136 Q208 150 194 136 Q180 150 166 136 Q150 150 136 136 Q118 146 92 176Z', c) },
  { name: 'Twin tails', back: (c) => P('M100 130 Q50 160 56 240 Q60 300 40 340 Q96 320 102 250 Q106 200 112 170Z', c) + mirror(P('M100 130 Q50 160 56 240 Q60 300 40 340 Q96 320 102 250 Q106 200 112 170Z', c)) + C(108, 132, 13, '#C9A7EB') + C(292, 132, 13, '#C9A7EB'), front: (c) => P(CAP, c) },
  { name: 'Top bun', back: (c) => C(200, 50, 40, c), front: (c) => P(CAP_SLEEK, c) + R(176, 70, 48, 14, 7, '#FF85A2') },
  { name: 'Crop', back: () => '', front: (c) => P('M100 158 C92 88 144 62 200 62 C256 62 308 88 300 158 C292 120 256 98 200 98 C144 98 108 120 100 158Z', c) },
];

// ---------------------------------------------------------------- tops
const sleeveShort = (c) => L('M160 274 L142 308', c, 34) + L('M240 274 L258 308', c, 34);
const sleeveLong = (c) => L(ARM_L, c, 30) + L(ARM_R, c, 30) + C(130, 334, 15, dark(c, 0.12)) + C(270, 334, 15, dark(c, 0.12));
const puff = (c) => C(150, 284, 26, c) + C(250, 284, 26, c);
const torso = (c, d = TORSO) => P(d, c);
const CROP = 'M152 266 Q200 248 248 266 L254 318 Q200 330 146 318 Z';

export const TOPS = [
  { name: 'Comfy tee', draw: (c) => sleeveShort(c) + torso(c) + heart(200, 300, 13, light(c, 0.6)) },
  { name: 'Tank top', draw: (c) => P('M162 266 L172 258 Q200 276 228 258 L238 266 L258 348 Q200 362 142 348 Z', c) + L('M160 264 L168 252', c, 8) + L('M240 264 L232 252', c, 8) },
  { name: 'Cosy sweater', draw: (c) => sleeveLong(c) + torso(c) + L('M146 338 Q200 352 254 338', dark(c, 0.15), 6) + L('M172 276 L172 330 M200 272 L200 334 M228 276 L228 330', light(c, 0.35), 4, 'stroke-dasharray="2 9"') },
  { name: 'Hoodie', draw: (c) => sleeveLong(c) + torso(c) + R(170, 306, 60, 30, 12, dark(c, 0.1)) + L('M188 266 L186 294 M212 266 L214 294', CREAM, 4) + C(186, 296, 4, CREAM) + C(214, 296, 4, CREAM) },
  { name: 'Collar blouse', draw: (c) => puff(c) + torso(c) + P('M164 262 Q182 290 200 270 Q218 290 236 262 Q200 250 164 262Z', CREAM) + [292, 314, 336].map((y) => C(200, y, 4.5, CREAM)).join('') },
  { name: 'Crop top', draw: (c) => sleeveShort(c) + P(CROP, c) + star(200, 292, 12, light(c, 0.6)) },
  { name: 'Striped tee', draw: (c) => sleeveShort(c) + torso(c) + L('M148 290 Q200 300 252 290 M146 312 Q200 322 254 312 M144 334 Q200 344 256 334', CREAM, 7) },
  { name: 'Cardigan', draw: (c) => sleeveLong(c) + torso(c) + P('M186 258 L200 356 L214 258 Q200 254 186 258Z', CREAM) + [286, 310, 334].map((y) => C(178, y, 4.5, dark(c, 0.3))).join('') },
  { name: 'Sailor top', draw: (c) => sleeveShort(c) + torso(c) + P('M160 262 L200 306 L240 262 Q200 250 160 262Z', '#5B7DB1') + P('M192 300 L178 316 L200 308 L222 316 L208 300Z', '#FF6F8E') + C(200, 304, 6, '#FF6F8E') },
  { name: 'Puff-sleeve top', draw: (c) => C(146, 286, 32, c) + C(254, 286, 32, c) + torso(c) + L('M150 330 Q200 344 250 330', CREAM, 5, 'stroke-dasharray="1 10"') },
];

// ---------------------------------------------------------------- bottoms
export const BOTTOMS = [
  { name: 'Shorts', draw: (c) => P('M144 332 L256 332 L262 384 L206 386 L200 362 L194 386 L138 384Z', c) + L('M156 340 L244 340', dark(c, 0.15), 4) },
  { name: 'A-line skirt', draw: (c) => P('M146 332 L254 332 L282 396 Q200 410 118 396Z', c) },
  { name: 'Pleated skirt', draw: (c) => P('M146 332 L254 332 L282 396 Q200 410 118 396Z', c) + L('M170 340 L156 402 M200 340 L200 406 M230 340 L244 402', dark(c, 0.2), 3) },
  { name: 'Jeans', draw: (c) => P('M144 332 L256 332 L250 432 L208 432 L200 368 L192 432 L150 432Z', c) + L('M158 352 Q172 360 184 350 M242 352 Q228 360 216 350', dark(c, 0.25), 3) + L('M172 380 L170 428 M228 380 L230 428', light(c, 0.3), 3, 'stroke-dasharray="3 6"') },
  { name: 'Bubble skirt', draw: (c) => P('M146 332 L254 332 Q300 360 272 392 Q200 412 128 392 Q100 360 146 332Z', c) + L('M136 388 Q200 404 264 388', dark(c, 0.15), 6) },
  { name: 'Tutu', draw: (c) => [[118, 372], [146, 380], [174, 384], [200, 386], [226, 384], [254, 380], [282, 372]].map(([x, y]) => C(x, y, 22, light(c, 0.15))).join('') + P('M148 332 L252 332 L272 372 Q200 388 128 372Z', c) },
  { name: 'Cargo pants', draw: (c) => P('M144 332 L256 332 L252 432 L208 432 L200 366 L192 432 L148 432Z', c) + R(150, 380, 24, 28, 6, dark(c, 0.12)) + R(226, 380, 24, 28, 6, dark(c, 0.12)) },
  { name: 'Polka leggings', draw: (c) => P('M146 332 L254 332 L234 432 L208 432 L200 366 L192 432 L166 432Z', c) + [[176, 352], [222, 350], [184, 390], [216, 396], [178, 420], [224, 418], [200, 342]].map(([x, y]) => C(x, y, 5, CREAM)).join('') },
];

// ---------------------------------------------------------------- dresses (replace top + bottom)
const BODICE = 'M152 266 Q200 248 248 266 L254 334 Q200 346 146 334 Z';
const skirtA = (c, y = 404) => P(`M146 324 L254 324 L286 ${y} Q200 ${y + 16} 114 ${y}Z`, c);
const gown = (c) => P('M150 322 L250 322 Q330 380 318 432 Q200 452 82 432 Q70 380 150 322Z', c);

export const DRESSES = [
  { name: 'A-line dress', draw: (c) => sleeveShort(c) + skirtA(c) + P(BODICE, c) + L('M150 330 Q200 342 250 330', dark(c, 0.15), 6) },
  { name: 'Ballgown', draw: (c) => gown(c) + P(BODICE, c) + L('M110 420 Q150 400 140 360 M290 420 Q250 400 260 360', light(c, 0.3), 5) },
  { name: 'Sundress', draw: (c) => skirtA(c) + P('M156 280 Q200 290 244 280 L254 334 Q200 346 146 334Z', c) + L('M164 282 L168 258 M236 282 L232 258', c, 7) + [[170, 360], [226, 372], [196, 392], [250, 396], [146, 394]].map(([x, y]) => C(x, y, 6, CREAM)).join('') },
  { name: 'Party puff dress', draw: (c) => puff(c) + P('M146 324 L254 324 Q306 370 290 400 Q200 418 110 400 Q94 370 146 324Z', c) + P(BODICE, c) + heart(200, 296, 10, light(c, 0.6)) },
  { name: 'Pinafore', draw: (c) => sleeveShort(CREAM) + P(TORSO, CREAM) + skirtA(c) + R(166, 270, 68, 66, 12, c) + L('M170 272 L162 256 M230 272 L238 256', c, 9) + R(184, 300, 32, 22, 8, dark(c, 0.12)) },
  { name: 'Princess gown', draw: (c) => C(146, 284, 26, light(c, 0.2)) + C(254, 284, 26, light(c, 0.2)) + gown(c) + P(BODICE, c) + L('M100 424 Q200 446 300 424', '#F2C14E', 6) + star(200, 290, 11, '#F2C14E') },
  { name: 'Starry gown', draw: (c) => gown(c) + P(BODICE, c) + [[150, 380], [236, 360], [204, 410], [120, 418], [276, 412], [180, 346], [262, 388]].map(([x, y], i) => star(x, y, i % 2 ? 7 : 9, CREAM)).join('') },
  { name: 'Ruffle dress', draw: (c) => P('M128 380 L272 380 L292 420 Q200 434 108 420Z', dark(c, 0.1)) + P('M138 350 L262 350 L280 390 Q200 402 120 390Z', c) + P('M146 324 L254 324 L266 360 Q200 370 134 360Z', light(c, 0.15)) + P(BODICE, c) },
];

// ---------------------------------------------------------------- shoes
const feet = (svg) => svg + `<g transform="translate(46 0)">${svg}</g>`;
export const SHOES = [
  { name: 'Sneakers', draw: (c) => feet(P('M160 422 Q160 412 172 412 L190 412 Q202 414 204 432 L204 438 L156 438Z', c) + R(154, 434, 52, 9, 4, CREAM) + L('M168 420 L188 420', CREAM, 3)) },
  { name: 'Boots', draw: (c) => feet(P('M166 384 L198 384 L198 420 Q206 424 206 438 L158 438 L162 420Z', c) + R(162, 380, 40, 12, 6, dark(c, 0.12))) },
  { name: 'Mary Janes', draw: (c) => feet(P('M158 430 Q158 418 172 418 L190 418 Q206 420 206 434 L206 440 L156 440Z', c) + L('M166 420 L196 414', dark(c, 0.2), 4) + C(194, 415, 3.5, CREAM)) },
  { name: 'Sandals', draw: (c) => feet(R(156, 434, 50, 8, 4, c) + L('M162 434 L180 420 L200 434', c, 6)) },
  { name: 'Rain boots', draw: (c) => feet(P('M164 376 L200 376 L200 420 Q210 424 208 440 L156 440 L160 420Z', c) + L('M170 384 L170 410', light(c, 0.6), 5)) },
  { name: 'Ballet flats', draw: (c) => feet(E(181, 434, 25, 9, c) + C(181, 428, 6, light(c, 0.4))) },
  { name: 'Platforms', draw: (c) => feet(R(156, 430, 50, 14, 6, dark(c, 0.15)) + P('M160 430 Q160 414 176 414 L188 414 Q204 418 204 430Z', c)) },
  { name: 'Bunny slippers', draw: (c) => feet(E(181, 430, 27, 14, c) + E(172, 408, 6, 14, c) + E(190, 408, 6, 14, c) + E(172, 410, 3, 9, '#FF8FA8') + E(190, 410, 3, 9, '#FF8FA8') + C(176, 428, 2.5, INK) + C(188, 428, 2.5, INK)) },
];

// ---------------------------------------------------------------- accessories (back = behind the body)
export const ACCESSORIES = [
  { name: 'Big bow', back: false, draw: (c) => P('M252 78 L212 56 Q204 78 212 100Z', c) + P('M252 78 L292 56 Q300 78 292 100Z', c) + C(252, 78, 11, dark(c, 0.15)) },
  { name: 'Sun hat', back: false, draw: (c) => E(200, 94, 150, 30, c) + P('M126 92 C126 30 274 30 274 92Z', c) + L('M130 84 Q200 98 270 84', '#FF85A2', 10) },
  { name: 'Beret', back: false, draw: (c) => P('M100 108 C98 52 196 36 282 64 Q318 84 300 112 Q200 92 100 108Z', c) + C(208, 46, 7, dark(c, 0.15)) },
  { name: 'Round glasses', back: false, draw: (c) => C(162, 186, 26, '#fff', 'fill-opacity="0.25"') + C(238, 186, 26, '#fff', 'fill-opacity="0.25"') + `<circle cx="162" cy="186" r="26" fill="none" stroke="${dark(c, 0.3)}" stroke-width="6"/><circle cx="238" cy="186" r="26" fill="none" stroke="${dark(c, 0.3)}" stroke-width="6"/>` + L('M188 184 Q200 176 212 184', dark(c, 0.3), 5) },
  { name: 'Heart shades', back: false, draw: (c) => heart(162, 186, 26, dark(c, 0.35)) + heart(238, 186, 26, dark(c, 0.35)) + L('M186 180 L214 180', dark(c, 0.35), 5) + E(152, 178, 6, 4, '#fff', 'opacity=".7"') + E(228, 178, 6, 4, '#fff', 'opacity=".7"') },
  { name: 'Handbag', back: false, draw: (c) => L('M266 336 Q284 300 302 336', dark(c, 0.2), 6) + R(256, 334, 56, 46, 14, c) + C(284, 352, 5, '#F2C14E') },
  { name: 'Fairy wings', back: true, draw: (c) => both(P('M180 290 Q90 200 70 250 Q60 300 160 310 Q80 330 100 370 Q130 390 184 320Z', light(c, 0.35), 'opacity="0.92"')) },
  { name: 'Halo', back: false, draw: () => `<ellipse cx="200" cy="44" rx="70" ry="16" fill="none" stroke="#F7D46B" stroke-width="12"/>` },
  { name: 'Cosy scarf', back: false, draw: (c) => P('M146 258 Q200 286 254 258 Q262 272 254 284 Q200 304 146 284 Q138 272 146 258Z', c) + R(222, 278, 26, 54, 10, c) + L('M226 330 L226 340 M236 330 L236 342 M246 330 L246 340', dark(c, 0.15), 4) },
  { name: 'Flower crown', back: false, draw: (c) => L('M108 112 Q200 70 292 112', '#7BC48F', 8) + [[118, 106], [150, 88], [184, 79], [216, 79], [250, 88], [282, 106]].map(([x, y], i) => [0, 72, 144, 216, 288].map((a) => C(x + Math.cos((a * Math.PI) / 180) * 8, y + Math.sin((a * Math.PI) / 180) * 8, 7, i % 2 ? c : CREAM)).join('') + C(x, y, 5, '#F7D46B')).join('') },
  { name: 'Headphones', back: false, draw: (c) => `<path d="M96 170 C90 40 310 40 304 170" fill="none" stroke="${dark(c, 0.15)}" stroke-width="14" stroke-linecap="round"/>` + R(80, 150, 34, 58, 16, c) + R(286, 150, 34, 58, 16, c) },
  { name: 'Tiara', back: false, draw: (c) => P('M140 92 L156 56 L176 82 L200 44 L224 82 L244 56 L260 92 Q200 82 140 92Z', '#F7D46B') + C(200, 66, 7, c) + C(158, 74, 5, c) + C(242, 74, 5, c) },
];

// ---------------------------------------------------------------- stickers
export const STICKERS = [
  { name: 'Star', draw: (x, y) => star(x, y, 24, '#FFD66B') },
  { name: 'Heart', draw: (x, y) => heart(x, y, 20, '#FF85A2') },
  { name: 'Cherries', draw: (x, y) => L(`M${x - 10} ${y + 6} Q${x} ${y - 24} ${x + 8} ${y - 22} M${x + 12} ${y + 8} Q${x + 8} ${y - 10} ${x + 8} ${y - 22}`, '#5E8F4E', 4) + C(x - 10, y + 10, 11, '#E8475F') + C(x + 13, y + 12, 11, '#E8475F') + E(x + 14, y - 22, 9, 5, '#7BC48F') },
  { name: 'Sparkle', draw: (x, y) => star(x, y, 24, '#C9A7EB', 4, 0.3) + star(x + 22, y - 16, 9, '#C9A7EB', 4, 0.3) },
  { name: 'Cloud', draw: (x, y) => C(x - 14, y + 4, 14, '#fff') + C(x + 2, y - 6, 18, '#fff') + C(x + 18, y + 4, 13, '#fff') + R(x - 28, y + 2, 58, 16, 8, '#fff') },
  { name: 'Flower', draw: (x, y) => [0, 72, 144, 216, 288].map((a) => C(x + Math.cos((a * Math.PI) / 180) * 13, y + Math.sin((a * Math.PI) / 180) * 13, 11, '#FFC4A3')).join('') + C(x, y, 9, '#FFE29A') },
  { name: 'Moon', draw: (x, y) => P(`M${x + 8} ${y - 24} A24 24 0 1 0 ${x + 10} ${y + 22} A18 18 0 1 1 ${x + 8} ${y - 24}Z`, '#FFE29A') },
  { name: 'Rainbow', draw: (x, y) => ['#FF85A2', '#FFE29A', '#A8E6CF', '#A7D3F2'].map((c, i) => `<path d="M${x - 30 + i * 7} ${y + 10} A${30 - i * 7} ${30 - i * 7} 0 0 1 ${x + 30 - i * 7} ${y + 10}" fill="none" stroke="${c}" stroke-width="7"/>`).join('') },
  { name: 'Butterfly', draw: (x, y) => E(x - 12, y - 8, 13, 15, '#A7D3F2') + E(x + 12, y - 8, 13, 15, '#A7D3F2') + E(x - 10, y + 12, 9, 10, '#C9A7EB') + E(x + 10, y + 12, 9, 10, '#C9A7EB') + R(x - 3, y - 18, 6, 36, 3, INK) },
  { name: 'Music note', draw: (x, y) => E(x - 8, y + 16, 11, 9, '#C9A7EB') + R(x, y - 24, 6, 40, 3, '#C9A7EB') + P(`M${x} ${y - 24} Q${x + 24} ${y - 20} ${x + 20} ${y - 2} Q${x + 14} ${y - 14} ${x + 6} ${y - 12}Z`, '#C9A7EB') },
];
// sticker positions are 0–255 → picture coordinates
export const stickerXY = ([x, y]) => [30 + (x / 255) * 340, 30 + (y / 255) * 400];

// ---------------------------------------------------------------- backgrounds
export const BACKGROUNDS = [
  { name: 'Picnic', draw: () => R(0, 0, W, H, 0, '#BFE3F5') + C(330, 70, 34, '#FFE29A') + E(110, 360, 260, 120, '#A8E6CF') + E(330, 380, 220, 110, '#93D9B6') + R(0, 400, W, 100, 0, '#9CDDB9') + P('M30 440 L370 440 L400 500 L0 500Z', '#FF9DB4') + [60, 140, 220, 300].map((x) => P(`M${x} 440 L${x + 40} 440 L${x + 46} 500 L${x - 6} 500Z`, '#FFF0F3')).join('') },
  { name: 'Bedroom', draw: () => R(0, 0, W, H, 0, '#E3D2F5') + R(40, 60, 110, 120, 16, '#BFE3F5') + L('M95 62 L95 178 M42 120 L148 120', '#fff', 8) + R(250, 250, 160, 140, 24, '#F4A7B9') + R(250, 230, 160, 40, 20, '#fff') + R(0, 400, W, 100, 0, '#D6BFEF') + E(200, 470, 170, 26, '#FFE29A') },
  { name: 'Beach', draw: () => R(0, 0, W, H, 0, '#BCE6F7') + C(80, 80, 36, '#FFE29A') + R(0, 300, W, 70, 0, '#7FC8EA') + L('M0 310 Q50 300 100 310 T200 310 T300 310 T400 310', '#fff', 6) + R(0, 360, W, 140, 0, '#FFE6B5') + L('M330 170 L340 420', '#C98A62', 8) + P('M260 190 Q335 110 410 190Z', '#FF85A2') },
  { name: 'Starry night', draw: () => R(0, 0, W, H, 0, '#3E3A6E') + P('M330 40 A40 40 0 1 0 352 116 A32 32 0 1 1 330 40Z', '#FFE29A') + [[50, 60, 9], [140, 40, 6], [240, 90, 8], [90, 170, 6], [320, 200, 7], [30, 260, 6], [370, 300, 8], [180, 140, 5]].map(([x, y, r]) => star(x, y, r, '#FFF3C4')).join('') + R(0, 410, W, 90, 0, '#5A5196') },
  { name: 'Café', draw: () => R(0, 0, W, H, 0, '#FFD9C2') + R(30, 50, 140, 100, 12, '#5E4A44') + L('M50 80 L120 80 M50 104 L140 104 M50 128 L100 128', '#fff', 5, 'opacity=".8"') + R(230, 120, 160, 14, 6, '#C98A62') + [250, 290, 330].map((x) => R(x, 88, 26, 32, 8, ['#A8E6CF', '#F4A7B9', '#A7D3F2'][(x - 250) / 40])).join('') + R(0, 410, W, 90, 0, '#E7B597') + [0, 80, 160, 240, 320].map((x) => R(x, 410, 40, 90, 0, '#F3C6A8')).join('') },
  { name: 'Garden', draw: () => R(0, 0, W, H, 0, '#D9F2E4') + E(60, 330, 120, 90, '#7BC48F') + E(340, 320, 120, 100, '#7BC48F') + R(0, 400, W, 100, 0, '#A8E6CF') + [[40, 420, '#FF85A2'], [100, 450, '#FFE29A'], [310, 430, '#C9A7EB'], [360, 460, '#FF85A2'], [70, 300, '#FFE29A'], [340, 280, '#F4A7B9']].map(([x, y, c]) => [0, 72, 144, 216, 288].map((a) => C(x + Math.cos((a * Math.PI) / 180) * 9, y + Math.sin((a * Math.PI) / 180) * 9, 8, c)).join('') + C(x, y, 6, '#FFF3C4')).join('') },
  { name: 'Stage', draw: () => R(0, 0, W, H, 0, '#4B2E4F') + P('M140 0 L260 0 L360 420 L40 420Z', '#FFF3C4', 'opacity=".25"') + P('M0 0 L110 0 Q90 200 120 420 L0 420Z', '#E8475F') + mirror(P('M0 0 L110 0 Q90 200 120 420 L0 420Z', '#E8475F')) + P('M0 0 L400 0 L400 40 Q300 70 200 40 Q100 70 0 40Z', '#C93A50') + R(0, 410, W, 90, 0, '#B07A52') },
  { name: 'Snow day', draw: () => R(0, 0, W, H, 0, '#DCEFFB') + E(80, 400, 200, 90, '#fff') + E(340, 410, 180, 80, '#F4FAFF') + P('M330 180 L370 280 L290 280Z', '#7BC48F') + P('M330 230 L380 340 L280 340Z', '#7BC48F') + R(322, 340, 16, 40, 4, '#A86E4B') + [[40, 60], [120, 120], [210, 50], [280, 110], [370, 60], [60, 220], [180, 200], [240, 260]].map(([x, y]) => C(x, y, 6, '#fff')).join('') + R(0, 430, W, 70, 0, '#fff') },
];

// ---------------------------------------------------------------- the whole look
const layer = (svg, fid) => (svg ? `<g filter="url(#${fid})">${svg}</g>` : '');

/** SVG markup for a recipe. `seed` changes the clay wobble (used for the stop-motion "boil"). */
export function lookSVG(r, { seed = 1, size = null, plain = false, stage = true } = {}) {
  const f = plain ? 'claybg' : 'clay';
  const bg = 'claybg';
  const skin = SKIN[r.skin] || SKIN[0];
  const hair = HAIR[r.hair] || HAIR[0];
  const hc = HAIR_COLOURS[r.hairColour] || HAIR_COLOURS[0];
  const col = (i) => COLOURS[i] || COLOURS[0];
  const accs = r.acc.map((a, i) => (a ? { ...ACCESSORIES[a - 1], c: col(r.accColour[i]) } : null)).filter(Boolean);

  const parts = [];
  if (stage) {
    parts.push(layer(BACKGROUNDS[r.background].draw(), bg));
    parts.push(layer(pedestal(), bg));
  }
  parts.push(layer(accs.filter((a) => a.back).map((a) => a.draw(a.c)).join(''), f));
  parts.push(layer(hair.back(hc), f));
  parts.push(layer(body(skin), f));
  if (r.dress) parts.push(layer(DRESSES[r.dress - 1].draw(col(r.dressColour)), f));
  else if (r.bottom) parts.push(layer(BOTTOMS[r.bottom - 1].draw(col(r.bottomColour)), f));
  if (r.shoes) parts.push(layer(SHOES[r.shoes - 1].draw(col(r.shoesColour)), f));
  if (!r.dress && r.top) parts.push(layer(TOPS[r.top - 1].draw(col(r.topColour)), f));
  parts.push(layer(head(skin, r.face), f));
  parts.push(layer(hair.front(hc), f));
  parts.push(layer(accs.filter((a) => !a.back).map((a) => a.draw(a.c)).join(''), f));
  parts.push(layer(r.stickers.map((s, i) => (s ? STICKERS[s - 1].draw(...stickerXY(r.stickerPos[i])) : '')).join(''), f));

  const dims = size ? `width="${size}" height="${Math.round((size * H) / W)}"` : '';
  const defs = plain
    ? clayFilter(bg, seed, { wobble: 3, grain: false })
    : clayFilter('clay', seed) + clayFilter(bg, seed + 3, { wobble: 3 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${dims}><defs>${defs}</defs>${parts.join('')}</svg>`;
}

// ---------------------------------------------------------------- rasterising
const cache = new Map();
/** A blob URL for one frame of a recipe (cached). */
export function lookURL(r, opts = {}) {
  const key = JSON.stringify([r, opts]);
  if (cache.has(key)) return cache.get(key);
  const url = URL.createObjectURL(new Blob([lookSVG(r, opts)], { type: 'image/svg+xml' }));
  cache.set(key, url);
  return url;
}
export function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

/** Thumbnails: one <img> per look; a wiggly clay blob shows while it loads. */
export function lookImg(r, alt = 'A clay cutie look') {
  const wrap = document.createElement('div');
  wrap.className = 'look-thumb is-loading';
  const img = new Image();
  img.alt = alt;
  img.decoding = 'async';
  img.onload = () => wrap.classList.remove('is-loading');
  img.src = lookURL(r);
  wrap.append(img);
  return wrap;
}
