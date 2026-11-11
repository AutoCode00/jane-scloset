# Jane's Closet

**Squish, style, slay.** A squishy claymation dress-up game. Style your clay cutie, enter Miss Button's daily "Look of the Day" challenge, vote for your favourites, and win the crown — every look saved on BOT Chain.

*Free to play (gas only). No tokens, no payments, no accounts, no backend.*

## Status

| | |
|---|---|
| Live site | _not published yet_ (GitHub Pages + custom domain) |
| Contract (BOT Chain mainnet, chain ID 677) | [`0xF1b943397ef9537f23b310426dC10d835A93b075`](https://scan.botchain.ai/address/0xF1b943397ef9537f23b310426dC10d835A93b075) |
| Contract (testnet, chain ID 968) | _not deployed yet_ |

Until a mainnet address is set, the site runs in **preview mode**: saves, entries and votes are simulated in the browser, with clearly-labelled sample cuties. A yellow bar says so and has **Skip a day →** (to try results and crowns) and **Reset**. Once the address is set, everything is real; add `?preview` to force preview mode, or `?net=testnet` to use the testnet contract.

## What's inside

| Route | What it is |
|---|---|
| `/` | Website: hero (stop-motion set — Miss Button pushes a clothing rack, the cutie spins through 3 outfits) · Meet the studio · Today's theme (live, countdown, entries) · The wardrobe shelf · Winners' wall (real crowned looks) · How it works · FAQ + CTA · runway footer |
| `/studio/` | Dress-up studio: 8 wardrobe tabs (Hair 12 · Tops 10 · Bottoms 8 · Dresses 8 · Shoes 8 · Extras 12 · Stickers 10 · Sets 8), 6 clay colours per item, 8 skin tones, 3 faces, draggable stickers, 🎲 Surprise me, ↺ Reset, 📸 Photo (PNG card), Save look → Enter today's challenge |
| `/challenge/` | Look of the Day: theme from the contract, enter one saved look, vote two-at-a-time or from the grid, results with podium, judges' score cards, crown drop and confetti; auto-crowns finished days |
| `/closet/` | Your saved looks (Restyle any of them), crowns, last 14 days of challenge history |
| `/deploy.html` | One-click deploy from MetaMask (testnet / mainnet) |

```
index.html  studio/  challenge/  closet/  deploy.html  404.html
assets/
  css/style.css        clay UI: pills, rolled-edge panels, felt grain, runway footer, responsive layouts
  js/config.js         ← contract addresses + links + the 30 themes (the one place to edit)
  js/recipe.js         the 32-byte look recipe (encode / decode / random) — shared with the tests
  js/art.js            clay renderer: every item as SVG layers + the clay filter (wobble, light, fingerprints)
  js/characters.js     Miss Button, Thimble, Peaches, Clover, Sprout
  js/wardrobe.js       tab catalog + item previews
  js/chain.js          MetaMask + contract (live) and the preview simulation
  js/common.js         nav, footer, wallet button, toasts, Thimble's "Saving…" overlay, word filter
  js/home.js · studio.js · challenge.js · closet.js
  img/                 BOT Chain logos, favicon
contracts/JanesCloset.sol
build/                 ABI + bytecode + standard JSON input (for explorer verification)
tools/                 compile, contract tests, dev server
```

## How the art works

There are no image files for the wardrobe: every item is a small SVG drawing, and an SVG filter turns flat shapes into clay — a low-frequency displacement for slightly uneven hand-made edges, diffuse + specular lighting on a blurred height map for the puffy look, a soft drop shadow, and fine noise for fingerprints. Items are coloured directly, so one drawing works for all six colours.

Layer order: background → pedestal → back accessories (wings) → back hair → body → bottoms/dress → shoes → top → head + face → front hair → accessories → stickers. Wings sit behind the body (the PRD lists back accessories after tops; behind the body reads better).

The **boil**: the studio rasterises the look three times with different wobble seeds and swaps the frames at ~8 fps on a canvas. Characters on the website jitter with a CSS `steps()` animation. Outfit changes squash-and-stretch with GSAP `steps(6)`. With `prefers-reduced-motion`, there is no boil, no runner, no confetti.

The 📸 Photo card is drawn on a canvas (1080×1350, clay frame, look name, theme) — no html-to-image needed. On phones it opens the share sheet; on desktop it downloads a PNG.

## Rules

- **Day** = `block.timestamp / 1 days` (UTC). **Theme** = `themes[day % 30]` — the names live in `config.js`, the index comes from the contract.
- **Recipe** (bytes32): version, skin, face, hair + colour, top/bottom/dress/shoes + colours, 3 accessories + colours, 3 stickers + positions, background. See the table at the top of `assets/js/recipe.js`.
- **Enter**: your own saved look, one entry per wallet per day.
- **Vote**: one per wallet per day, only today's challenge, never your own look.
- **Winner**: most votes; ties go to the earlier entry. Anyone can call `finalize(day)` after the day ends; the Results tab does it automatically (once per day per browser) when a connected wallet opens it, and otherwise shows **Crown the winner**.
- **Content safety**: only preset items, no uploads; the only text is a look name ≤ 20 bytes, checked by a small word filter in the app and a length cap in the contract.

## Contract

`contracts/JanesCloset.sol` — Solidity ^0.8.20, optimizer 200 runs, EVM `paris`. Runtime ≈ 7.6 KB. No tokens or payments, no owner.

- `saveLook(bytes32 recipe, string name) returns (uint256 id)`
- `enter(uint256 lookId)` · `vote(uint32 day, uint256 lookId)` · `finalize(uint32 day)`
- Views: `today()`, `themeIndex(day)`, `entries(day)`, `votesFor(day, lookId)`, `winnerOf(day)` (lookId + 1, 0 = none), `looksOf(addr)`, `crowns(addr)`, `stats()` (looks, crowns, entries, votes), plus `getLook`, `getLooks(ids)`, `dayInfo(day)` (everything for one day in one call), `enteredLook(day, addr)`, `votedFor(day, addr)`, `recentWinners(n)`
- Events: `LookSaved(id, owner)`, `Entered(day, lookId)`, `Voted(day, lookId, voter)`, `Crowned(day, lookId, owner)`
- Custom errors with friendly messages in the app: `NotYourLook`, `AlreadyEntered`, `NotToday`, `NotEntered`, `OwnLook`, `AlreadyVoted`, `DayNotOver`, `AlreadyFinalized`, `NameTooLong`, `EmptyRecipe`, `NoSuchLook`

## Run locally

```bash
node tools/serve.mjs
```

Open http://localhost:4624.

## Tests

```bash
npm --prefix tools install
```

```bash
node tools/compile.mjs && node tools/test-contract.mjs
```

The test runs the contract on an in-memory chain (ganache) and checks: recipe round-trips, saving, entering once per day, all vote rules, the earlier-entry tie-break, a later entry overtaking with more votes, finalize timing, crowns, empty days, `recentWinners` order and `stats`.

## Deploy

1. `node tools/serve.mjs`, open http://localhost:4624/deploy.html, and click **Deploy to Testnet (968)**. The localhost site picks up the new address automatically (`?net=testnet`).
2. Try it: save a look, enter it, vote from a second wallet, and (the next UTC day) crown the winner.
3. **Deploy to Mainnet (677)**. Paste the address into `assets/js/config.js` → `networks.mainnet.contract`, and into the Status table above.
4. Verify on scan.botchain.ai with `build/JanesCloset.standard-input.json` (compiler 0.8.20, optimizer 200, EVM paris).
5. Push to GitHub, enable Pages (root of the default branch), and add your custom domain (a `CNAME` file in the root).

## Credits

All characters (Miss Button, Thimble, Peaches, Clover, Sprout, the cuties) and all wardrobe art are original, drawn in code for this project. Fonts: Fredoka and Nunito (Google Fonts). Libraries: ethers.js v6, GSAP 3. BOT Chain logo © BOT Chain.
