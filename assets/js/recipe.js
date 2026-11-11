// The look recipe: a whole outfit packed into 32 bytes (stored on-chain as bytes32).
// Pure module — shared by the browser and the Node tests.
//
// byte  0      version (always 1, so a recipe is never all zeros)
// byte  1      skin tone 0–7
// byte  2      face 0–2 (smiley, sleepy, wink)
// bytes 3–4    hair style 0–11, hair colour 0–5
// bytes 5–6    top 0–10 (0 = none), colour 0–5
// bytes 7–8    bottom 0–8 (0 = none), colour
// bytes 9–10   dress 0–8 (0 = none; replaces top + bottom), colour
// bytes 11–12  shoes 0–8 (0 = none), colour
// bytes 13–15  up to 3 accessories 0–12 (0 = empty slot)
// bytes 16–18  accessory colours
// bytes 19–21  up to 3 stickers 0–10 (0 = empty slot)
// bytes 22–27  sticker positions x, y (0–255 each, scaled to the picture)
// byte  28     background 0–7
// bytes 29–31  reserved (0)

export const COUNTS = { skin: 8, face: 3, hair: 12, colours: 6, top: 10, bottom: 8, dress: 8, shoes: 8, acc: 12, sticker: 10, background: 8 };
export const VERSION = 1;

export function emptyRecipe() {
  return {
    skin: 1, face: 0, hair: 0, hairColour: 0,
    top: 1, topColour: 0, bottom: 2, bottomColour: 3,
    dress: 0, dressColour: 0, shoes: 1, shoesColour: 0,
    acc: [0, 0, 0], accColour: [0, 0, 0],
    stickers: [0, 0, 0], stickerPos: [[40, 60], [215, 70], [200, 190]],
    background: 0,
  };
}

const clamp = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : 0);

export function encodeRecipe(r) {
  const b = new Uint8Array(32);
  b[0] = VERSION;
  b[1] = clamp(r.skin, COUNTS.skin - 1);
  b[2] = clamp(r.face, COUNTS.face - 1);
  b[3] = clamp(r.hair, COUNTS.hair - 1);
  b[4] = clamp(r.hairColour, COUNTS.colours - 1);
  b[5] = clamp(r.top, COUNTS.top);
  b[6] = clamp(r.topColour, COUNTS.colours - 1);
  b[7] = clamp(r.bottom, COUNTS.bottom);
  b[8] = clamp(r.bottomColour, COUNTS.colours - 1);
  b[9] = clamp(r.dress, COUNTS.dress);
  b[10] = clamp(r.dressColour, COUNTS.colours - 1);
  b[11] = clamp(r.shoes, COUNTS.shoes);
  b[12] = clamp(r.shoesColour, COUNTS.colours - 1);
  for (let i = 0; i < 3; i++) {
    b[13 + i] = clamp(r.acc[i], COUNTS.acc);
    b[16 + i] = clamp(r.accColour[i], COUNTS.colours - 1);
    b[19 + i] = clamp(r.stickers[i], COUNTS.sticker);
    b[22 + i * 2] = clamp(r.stickerPos[i][0], 255);
    b[23 + i * 2] = clamp(r.stickerPos[i][1], 255);
  }
  b[28] = clamp(r.background, COUNTS.background - 1);
  return '0x' + [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function decodeRecipe(hex) {
  const h = String(hex).replace(/^0x/, '').padEnd(64, '0');
  const b = Array.from({ length: 32 }, (_, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16) || 0);
  const r = {
    skin: clamp(b[1], COUNTS.skin - 1), face: clamp(b[2], COUNTS.face - 1),
    hair: clamp(b[3], COUNTS.hair - 1), hairColour: clamp(b[4], COUNTS.colours - 1),
    top: clamp(b[5], COUNTS.top), topColour: clamp(b[6], COUNTS.colours - 1),
    bottom: clamp(b[7], COUNTS.bottom), bottomColour: clamp(b[8], COUNTS.colours - 1),
    dress: clamp(b[9], COUNTS.dress), dressColour: clamp(b[10], COUNTS.colours - 1),
    shoes: clamp(b[11], COUNTS.shoes), shoesColour: clamp(b[12], COUNTS.colours - 1),
    acc: [0, 1, 2].map((i) => clamp(b[13 + i], COUNTS.acc)),
    accColour: [0, 1, 2].map((i) => clamp(b[16 + i], COUNTS.colours - 1)),
    stickers: [0, 1, 2].map((i) => clamp(b[19 + i], COUNTS.sticker)),
    stickerPos: [0, 1, 2].map((i) => [b[22 + i * 2], b[23 + i * 2]]),
    background: clamp(b[28], COUNTS.background - 1),
  };
  return r;
}

const pick = (n) => Math.floor(Math.random() * n);

export function randomRecipe() {
  const r = emptyRecipe();
  r.skin = pick(COUNTS.skin);
  r.face = pick(COUNTS.face);
  r.hair = pick(COUNTS.hair);
  r.hairColour = pick(COUNTS.colours);
  if (Math.random() < 0.35) {
    r.dress = 1 + pick(COUNTS.dress); r.top = 0; r.bottom = 0;
  } else {
    r.dress = 0; r.top = 1 + pick(COUNTS.top); r.bottom = 1 + pick(COUNTS.bottom);
  }
  r.topColour = pick(COUNTS.colours); r.bottomColour = pick(COUNTS.colours); r.dressColour = pick(COUNTS.colours);
  r.shoes = 1 + pick(COUNTS.shoes); r.shoesColour = pick(COUNTS.colours);
  const accs = [...Array(COUNTS.acc).keys()].map((i) => i + 1).sort(() => Math.random() - 0.5);
  const nAcc = pick(3);
  r.acc = [0, 1, 2].map((i) => (i < nAcc ? accs[i] : 0));
  r.accColour = [0, 1, 2].map(() => pick(COUNTS.colours));
  const nSt = pick(4);
  r.stickers = [0, 1, 2].map((i) => (i < nSt ? 1 + pick(COUNTS.sticker) : 0));
  r.stickerPos = [[20 + pick(40), 30 + pick(60)], [190 + pick(45), 30 + pick(70)], [pick(255), 150 + pick(60)]];
  r.background = pick(COUNTS.background);
  return r;
}

// A UTC day number, same as the contract's block.timestamp / 1 days.
export const dayOf = (ms = Date.now()) => Math.floor(ms / 86400000);
