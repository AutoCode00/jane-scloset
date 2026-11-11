// Runs the compiled JanesCloset contract on an in-memory chain and checks the PRD rules (section 4 + 5).
// Usage (from the project root): node tools/compile.mjs && node tools/test-contract.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import * as ethers from 'ethers';
import { encodeRecipe, decodeRecipe, randomRecipe } from '../assets/js/recipe.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { abi, bytecode } = JSON.parse(readFileSync(join(root, 'build/JanesCloset.json'), 'utf8'));
const chain = ganache.provider({ logging: { quiet: true }, chain: { hardfork: 'merge', chainId: 677, time: new Date('2026-11-10T09:00:00Z') }, wallet: { totalAccounts: 5 } });
const provider = new ethers.BrowserProvider(chain);
const [alice, bob, carol, dave] = await Promise.all([0, 1, 2, 3].map((i) => provider.getSigner(i)));
const c = await (await new ethers.ContractFactory(abi, bytecode, alice).deploy()).waitForDeployment();
const as = (s) => c.connect(s);
const reverts = (call, name) => assert.rejects(call, (e) => e.revert?.name === name || (e.message || '').includes(name), `expected ${name}`);
const nextDay = async () => { await provider.send('evm_increaseTime', [86400]); await provider.send('evm_mine', []); };
const send = (p) => p.then((t) => t.wait());
let checks = 0;
const ok = (label) => { checks++; console.log(`  ✓ ${label}`); };

console.log("Jane's Closet contract");

// recipe round trip (shared with the app)
for (let i = 0; i < 50; i++) {
  const r = randomRecipe();
  assert.deepEqual(decodeRecipe(encodeRecipe(r)), r);
}
ok('recipe encodes to bytes32 and decodes back (50 random outfits)');

const fixed = Array.from({ length: 8 }, () => encodeRecipe(randomRecipe()));
const R = (n) => fixed[n];
assert.deepEqual([...(await c.stats())].map(Number), [0, 0, 0, 0]);
await reverts(as(alice).saveLook.staticCall(ethers.ZeroHash, 'x'), 'EmptyRecipe');
await reverts(as(alice).saveLook.staticCall(R(1), 'x'.repeat(21)), 'NameTooLong');
const rc = await send(as(alice).saveLook(R(1), 'Picnic princess'));
assert.equal(c.interface.parseLog(rc.logs[0]).name, 'LookSaved');
await send(as(alice).saveLook(R(2), 'Second'));
await send(as(bob).saveLook(R(3), 'Bob look'));
await send(as(carol).saveLook(R(4), 'Carol look'));
assert.deepEqual((await c.looksOf(alice.address)).map(Number), [0, 1]);
const l0 = await c.getLook(0);
assert.equal(l0.owner, alice.address); assert.equal(l0.name, 'Picnic princess'); assert.equal(l0.recipe, R(1));
assert.equal((await c.getLooks([0, 2])).length, 2);
ok('saveLook stores owner, recipe, name; rejects empty recipe and names over 20 bytes');

const day = Number(await c.today());
assert.equal(day, Math.floor(Date.parse('2026-11-10T09:00:00Z') / 86400000));
assert.equal(Number(await c.themeIndex(day)), day % 30);
ok('today() is the UTC day; themeIndex = day % 30');

await reverts(as(bob).enter.staticCall(0), 'NotYourLook');
await reverts(as(bob).enter.staticCall(99), 'NoSuchLook');
await send(as(alice).enter(0));
await reverts(as(alice).enter.staticCall(1), 'AlreadyEntered');
await send(as(bob).enter(2));
await send(as(carol).enter(3));
assert.deepEqual((await c.entries(day)).map(Number), [0, 2, 3]);
assert.equal(Number(await c.enteredLook(day, alice.address)), 1);
ok('enter: only your own look, once per wallet per day');

await reverts(as(alice).vote.staticCall(day, 0), 'OwnLook');
await reverts(as(alice).vote.staticCall(day, 1), 'NotEntered');
await reverts(as(alice).vote.staticCall(day + 1, 2), 'NotToday');
await reverts(as(alice).finalize.staticCall(day), 'DayNotOver');
// Tie between look 2 and look 3 (one vote each) → earlier entry (look 2) leads.
await send(as(alice).vote(day, 3));
await reverts(as(alice).vote.staticCall(day, 2), 'AlreadyVoted');
await send(as(dave).vote(day, 2));
assert.equal(Number(await c.votesFor(day, 2)), 1);
assert.equal(Number(await c.votedFor(day, alice.address)), 4);
let info = await c.dayInfo(day);
assert.equal(Number(info.leader), 3); // look 2 (+1): tie, entered before look 3
ok('vote: once per wallet, only today, not your own; ties go to the earlier entry');

await nextDay();
await reverts(as(bob).vote.staticCall(day, 0), 'NotToday');
assert.equal(Number(await c.winnerOf(day)), 0);
const fr = await send(as(dave).finalize(day));
assert.equal(c.interface.parseLog(fr.logs[0]).name, 'Crowned');
await reverts(as(dave).finalize.staticCall(day), 'AlreadyFinalized');
assert.equal(Number(await c.winnerOf(day)), 3);
assert.equal(Number(await c.crowns(bob.address)), 1);
assert.ok(await c.finalized(day));
ok('finalize after the day ends crowns the leader once; anyone can call it');

// Day 2: a later entry overtakes with more votes; empty days finalize with no crown.
const d2 = Number(await c.today());
await send(as(alice).enter(1));
await send(as(carol).enter(3));
await send(as(bob).vote(d2, 3));
await send(as(dave).vote(d2, 3));
await send(as(carol).vote(d2, 1));
info = await c.dayInfo(d2);
assert.deepEqual(info.votes.map(Number), [1, 2]);
assert.equal(Number(info.leader), 4);
await nextDay();
await send(as(bob).finalize(d2));
await nextDay();
await send(as(bob).finalize(d2 + 1)); // nobody entered
assert.equal(Number(await c.winnerOf(d2 + 1)), 0);
const w = await c.recentWinners(10);
assert.deepEqual(w.days_.map(Number), [d2, day]);
assert.deepEqual(w.lookIds.map(Number), [3, 2]);
assert.equal(w.items[0].owner, carol.address);
assert.deepEqual([...(await c.stats())].map(Number), [4, 2, 5, 5]);
ok('more votes beat an earlier entry; empty days crown nobody; recentWinners newest first; stats add up');

console.log(`\n${checks} checks passed`);
process.exit(0);
