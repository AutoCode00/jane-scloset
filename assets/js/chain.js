// Wallet + contract. Two modes:
//  live    — a contract address is set in config.js: reads from the BOT Chain RPC, writes through MetaMask.
//  preview — no address yet (or ?preview): a simulated contract saved in this browser, with sample cuties,
//            so the whole game can be tried before deployment. A banner says so.
import { CONFIG } from './config.js';
import { encodeRecipe, randomRecipe, dayOf } from './recipe.js';

const params = new URLSearchParams(location.search);
const NET_KEY = params.get('net') === 'testnet' ? 'testnet' : 'mainnet';
export const NET = CONFIG.networks[NET_KEY];
const storedAddr = (() => { try { return localStorage.getItem(`${CONFIG.storageKey}.contract.${NET.chainId}`); } catch { return null; } })();
export const CONTRACT = NET.contract || (location.hostname === 'localhost' ? storedAddr : '') || '';
export const MODE = CONTRACT && !params.has('preview') ? 'live' : 'preview';
export const explorerAddress = (a) => `${NET.explorer}/address/${a}`;
export const explorerTx = (h) => `${NET.explorer}/tx/${h}`;

export const ABI = [
  'function saveLook(bytes32 recipe, string name) returns (uint256)',
  'function enter(uint256 lookId)',
  'function vote(uint32 day, uint256 lookId)',
  'function finalize(uint32 day)',
  'function today() view returns (uint32)',
  'function themeIndex(uint32 day) view returns (uint256)',
  'function getLooks(uint256[] ids) view returns (tuple(address owner, bytes32 recipe, string name, uint64 at)[])',
  'function looksOf(address who) view returns (uint256[])',
  'function crowns(address who) view returns (uint256)',
  'function finalized(uint32 day) view returns (bool)',
  'function winnerOf(uint32 day) view returns (uint256)',
  'function enteredLook(uint32 day, address who) view returns (uint256)',
  'function votedFor(uint32 day, address who) view returns (uint256)',
  'function dayInfo(uint32 day) view returns (uint256[] ids, uint256[] votes, tuple(address owner, bytes32 recipe, string name, uint64 at)[] items, bool isFinal, uint256 leader)',
  'function recentWinners(uint256 count) view returns (uint32[] days_, uint256[] lookIds, tuple(address owner, bytes32 recipe, string name, uint64 at)[] items)',
  'function stats() view returns (uint256, uint256, uint256, uint256)',
  'event LookSaved(uint256 indexed id, address indexed owner)',
  'error EmptyRecipe()', 'error NameTooLong()', 'error NoSuchLook()', 'error NotYourLook()', 'error AlreadyEntered()',
  'error NotToday()', 'error NotEntered()', 'error OwnLook()', 'error AlreadyVoted()', 'error DayNotOver()', 'error AlreadyFinalized()',
];

const FRIENDLY = {
  EmptyRecipe: 'That look is empty — add something first!',
  NameTooLong: 'Look names can be 20 characters at most.',
  NoSuchLook: "That look doesn't exist.",
  NotYourLook: 'You can only enter your own looks.',
  AlreadyEntered: "You're in today already! Come back to vote.",
  NotToday: "Voting for that day is closed.",
  NotEntered: "That look isn't in today's challenge.",
  OwnLook: "No voting for yourself, cutie!",
  AlreadyVoted: "You've already voted today.",
  DayNotOver: "This day isn't over yet.",
  AlreadyFinalized: 'The crown has already been given out.',
  rejected: 'You cancelled in MetaMask. Nothing was saved.',
  noWallet: 'MetaMask not found. Install it to save, enter and vote.',
  wrongNetwork: 'Please switch MetaMask to BOT Chain.',
};
export class ChainError extends Error {
  constructor(code, msg) { super(msg || FRIENDLY[code] || code); this.code = code; }
}
const fail = (code) => { throw new ChainError(code); };

export const bus = new EventTarget();
const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));

// ===================================================================== wallet
export const wallet = { address: '', chainId: 0 };
export const onRightChain = () => MODE === 'preview' || wallet.chainId === NET.chainId;
export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const hasMM = () => typeof window !== 'undefined' && !!window.ethereum;

async function refreshChain() {
  if (!hasMM()) return;
  try { wallet.chainId = parseInt(await ethereum.request({ method: 'eth_chainId' }), 16); } catch { wallet.chainId = 0; }
}

async function switchChain() {
  const chainId = '0x' + NET.chainId.toString(16);
  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
  } catch (e) {
    const unknown = e.code === 4902 || e?.data?.originalError?.code === 4902 || /unrecognized chain/i.test(e.message || '');
    if (!unknown) throw e;
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId, chainName: NET.name, nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 }, rpcUrls: [NET.rpc], blockExplorerUrls: [NET.explorer] }],
    });
  }
  await refreshChain();
}

export async function connect() {
  if (MODE === 'preview') {
    const s = load();
    if (!s.me) { s.me = randomAddress(); save(s); }
    wallet.address = s.me;
    wallet.chainId = NET.chainId;
    sessionFlag(true);
    emit('wallet');
    return wallet.address;
  }
  if (!hasMM()) fail('noWallet');
  try {
    const [a] = await ethereum.request({ method: 'eth_requestAccounts' });
    wallet.address = a;
  } catch (e) { if (e.code === 4001) fail('rejected'); throw e; }
  await refreshChain();
  if (!onRightChain()) { try { await switchChain(); } catch { /* the UI shows "Switch to BOT Chain" */ } }
  sessionFlag(true);
  emit('wallet');
  return wallet.address;
}
export async function switchNetwork() {
  if (MODE === 'preview') return;
  try { await switchChain(); } catch (e) { if (e.code === 4001) fail('rejected'); fail('wrongNetwork'); }
  emit('wallet');
}
export function disconnect() { wallet.address = ''; sessionFlag(false); emit('wallet'); }
function sessionFlag(on) { try { on ? localStorage.setItem(`${CONFIG.storageKey}.connected`, '1') : localStorage.removeItem(`${CONFIG.storageKey}.connected`); } catch { /* ignore */ } }

export async function restoreWallet() {
  let was = false;
  try { was = localStorage.getItem(`${CONFIG.storageKey}.connected`) === '1'; } catch { /* ignore */ }
  if (MODE === 'preview') { if (was) await connect(); return; }
  if (!hasMM()) return;
  ethereum.on?.('accountsChanged', (a) => { wallet.address = a[0] || ''; emit('wallet'); });
  ethereum.on?.('chainChanged', (c) => { wallet.chainId = parseInt(c, 16); emit('wallet'); });
  if (!was) return;
  try {
    const [a] = await ethereum.request({ method: 'eth_accounts' });
    if (a) { wallet.address = a; await refreshChain(); emit('wallet'); }
  } catch { /* ignore */ }
}

async function needWallet() {
  if (!wallet.address) await connect();
  if (!onRightChain()) await switchNetwork();
  if (!onRightChain()) fail('wrongNetwork');
}

// ===================================================================== live
let _read, _write;
function reader() {
  if (!_read) _read = new ethers.Contract(CONTRACT, ABI, new ethers.JsonRpcProvider(NET.rpc, NET.chainId, { staticNetwork: true }));
  return _read;
}
async function writer() {
  await needWallet();
  if (!_write || _write.__addr !== wallet.address) {
    const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
    _write = new ethers.Contract(CONTRACT, ABI, signer);
    _write.__addr = wallet.address;
  }
  return _write;
}
const toLook = (l, id) => ({ id: Number(id), owner: l.owner, recipe: l.recipe, name: l.name, at: Number(l.at) });

async function send(fn, onSent) {
  try {
    const tx = await fn();
    onSent?.(tx.hash);
    const rc = await tx.wait();
    emit('data');
    return rc;
  } catch (e) {
    if (e instanceof ChainError) throw e;
    if (e.code === 4001 || e.code === 'ACTION_REJECTED') fail('rejected');
    const name = e.revert?.name || Object.keys(FRIENDLY).find((k) => (e.message || '').includes(k));
    if (name && FRIENDLY[name]) fail(name);
    throw new ChainError('failed', `Something went wrong: ${e.shortMessage || e.message}`);
  }
}

const live = {
  async today() { return Number(await reader().today()); },
  async stats() { const s = await reader().stats(); return { looks: Number(s[0]), crowns: Number(s[1]), entries: Number(s[2]), votes: Number(s[3]) }; },
  async dayInfo(day) {
    const r = await reader().dayInfo(day);
    return {
      entries: r.ids.map((id, i) => ({ ...toLook(r.items[i], id), votes: Number(r.votes[i]) })),
      finalized: r.isFinal,
      leader: Number(r.leader) - 1,
    };
  },
  async recentWinners(n) {
    const r = await reader().recentWinners(n);
    return r.days_.map((d, i) => ({ day: Number(d), look: toLook(r.items[i], r.lookIds[i]) }));
  },
  async looksOf(addr) {
    const ids = (await reader().looksOf(addr)).map(Number);
    if (!ids.length) return [];
    const items = await reader().getLooks(ids);
    return ids.map((id, i) => toLook(items[i], id));
  },
  async crowns(addr) { return Number(await reader().crowns(addr)); },
  async myDay(day, addr) {
    const [e, v] = await Promise.all([reader().enteredLook(day, addr), reader().votedFor(day, addr)]);
    return { entered: Number(e) - 1, voted: Number(v) - 1 };
  },
  async winnerOf(day) { return Number(await reader().winnerOf(day)) - 1; },
  async saveLook(recipe, name, onSent) {
    const c = await writer();
    const rc = await send(() => c.saveLook(encodeRecipe(recipe), name), onSent);
    const ev = rc.logs.map((l) => { try { return c.interface.parseLog(l); } catch { return null; } }).find((x) => x?.name === 'LookSaved');
    return ev ? Number(ev.args.id) : null;
  },
  async enter(id, onSent) { const c = await writer(); await send(() => c.enter(id), onSent); },
  async vote(day, id, onSent) { const c = await writer(); await send(() => c.vote(day, id), onSent); },
  async finalize(day, onSent) { const c = await writer(); await send(() => c.finalize(day), onSent); },
};

// ===================================================================== preview (simulated contract)
const KEY = `${CONFIG.storageKey}.preview.v1`;
function randomAddress() {
  const b = new Uint8Array(20);
  crypto.getRandomValues(b);
  return '0x' + [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const SAMPLE_NAMES = ['Daisy Doodle', 'Mochi Moon', 'Pip Puff', 'Coco Clay', 'Bean Bloom', 'Lulu Lark', 'Tofu Twirl', 'Kiki Knit'];
let memory = null;
function load() {
  if (memory) return memory;
  try { memory = JSON.parse(localStorage.getItem(KEY)); } catch { memory = null; }
  if (!memory) { memory = seed(); save(memory); }
  return memory;
}
function save(s) { memory = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: keeps working in memory */ } }

function seed() {
  const s = { looks: [], entries: {}, votes: {}, voted: {}, entered: {}, finalized: {}, winner: {}, crowns: {}, crownedDays: [], totalEntries: 0, totalVotes: 0, dayOffset: 0, me: '' };
  const samples = SAMPLE_NAMES.map(() => randomAddress());
  const now = Math.floor(Date.now() / 1000);
  const today = dayOf();
  // three past crowned days and today's open challenge
  for (const back of [3, 2, 1, 0]) {
    const day = today - back;
    const who = samples.slice(back, back + 4);
    who.forEach((owner, i) => {
      const id = s.looks.length;
      s.looks.push({ owner, recipe: encodeRecipe(randomRecipe()), name: SAMPLE_NAMES[(back + i) % 8], at: now - back * 86400 - i * 600, sample: true });
      (s.entries[day] ||= []).push(id);
      (s.entered[day] ||= {})[owner.toLowerCase()] = id + 1;
      s.totalEntries++;
      const v = back === 0 ? [2, 1, 3, 0][i] : [1, 4, 2, 3][(i + back) % 4];
      (s.votes[day] ||= {})[id] = v;
      s.totalVotes += v;
    });
    if (back > 0) finalizeSim(s, day);
  }
  return s;
}
function leaderOf(s, day) {
  const ids = s.entries[day] || [];
  let best = -1, bv = -1;
  for (const id of ids) { const v = s.votes[day]?.[id] || 0; if (v > bv) { best = id; bv = v; } }
  return best;
}
function finalizeSim(s, day) {
  s.finalized[day] = true;
  const w = leaderOf(s, day);
  if (w < 0) return;
  s.winner[day] = w + 1;
  const o = s.looks[w].owner.toLowerCase();
  s.crowns[o] = (s.crowns[o] || 0) + 1;
  s.crownedDays.push(day);
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function simTx(onSent, fn) {
  await needWallet();
  onSent?.('0xpreview');
  await pause(900);
  const s = load();
  const out = fn(s);
  save(s);
  emit('data');
  return out;
}
const me = () => wallet.address.toLowerCase();
const pLook = (s, id) => ({ id, ...s.looks[id] });

const preview = {
  async today() { return dayOf() + (load().dayOffset || 0); },
  async stats() { const s = load(); return { looks: s.looks.length, crowns: s.crownedDays.length, entries: s.totalEntries, votes: s.totalVotes }; },
  async dayInfo(day) {
    const s = load();
    return { entries: (s.entries[day] || []).map((id) => ({ ...pLook(s, id), votes: s.votes[day]?.[id] || 0 })), finalized: !!s.finalized[day], leader: leaderOf(s, day) };
  },
  async recentWinners(n) {
    const s = load();
    return s.crownedDays.slice(-n).reverse().map((day) => ({ day, look: pLook(s, s.winner[day] - 1) }));
  },
  async looksOf(addr) { const s = load(); return s.looks.map((l, id) => ({ id, ...l })).filter((l) => l.owner.toLowerCase() === addr.toLowerCase()); },
  async crowns(addr) { return load().crowns[addr.toLowerCase()] || 0; },
  async myDay(day, addr) { const s = load(); const a = addr.toLowerCase(); return { entered: (s.entered[day]?.[a] || 0) - 1, voted: (s.voted[day]?.[a] || 0) - 1 }; },
  async winnerOf(day) { return (load().winner[day] || 0) - 1; },
  async saveLook(recipe, name, onSent) {
    if (name.length > 20) fail('NameTooLong');
    return simTx(onSent, (s) => { s.looks.push({ owner: wallet.address, recipe: encodeRecipe(recipe), name, at: Math.floor(Date.now() / 1000) }); return s.looks.length - 1; });
  },
  async enter(id, onSent) {
    const day = await preview.today();
    return simTx(onSent, (s) => {
      if (!s.looks[id]) fail('NoSuchLook');
      if (s.looks[id].owner.toLowerCase() !== me()) fail('NotYourLook');
      if (s.entered[day]?.[me()]) fail('AlreadyEntered');
      (s.entered[day] ||= {})[me()] = id + 1;
      (s.entries[day] ||= []).push(id);
      s.totalEntries++;
    });
  },
  async vote(day, id, onSent) {
    const today = await preview.today();
    return simTx(onSent, (s) => {
      if (day !== today) fail('NotToday');
      if (!(s.entries[day] || []).includes(id)) fail('NotEntered');
      if (s.looks[id].owner.toLowerCase() === me()) fail('OwnLook');
      if (s.voted[day]?.[me()]) fail('AlreadyVoted');
      (s.voted[day] ||= {})[me()] = id + 1;
      (s.votes[day] ||= {})[id] = (s.votes[day][id] || 0) + 1;
      s.totalVotes++;
    });
  },
  async finalize(day, onSent) {
    const today = await preview.today();
    return simTx(onSent, (s) => {
      if (day >= today) fail('DayNotOver');
      if (s.finalized[day]) fail('AlreadyFinalized');
      finalizeSim(s, day);
    });
  },
};

// Preview-only helpers for the banner.
export function skipDay() {
  const s = load();
  // sample cuties enter the new day so there is always something to vote on
  const day = dayOf() + s.dayOffset + 1;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 3; i++) {
    const owner = randomAddress();
    const id = s.looks.length;
    s.looks.push({ owner, recipe: encodeRecipe(randomRecipe()), name: SAMPLE_NAMES[(day + i) % 8], at: now, sample: true });
    (s.entries[day] ||= []).push(id);
    (s.entered[day] ||= {})[owner] = id + 1;
    (s.votes[day] ||= {})[id] = i;
    s.totalEntries++; s.totalVotes += i;
  }
  s.dayOffset++;
  save(s);
  emit('data');
}
export function resetPreview() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } memory = null; emit('data'); }

export const api = MODE === 'live' ? live : preview;
