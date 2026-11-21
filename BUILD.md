# BUILD.md — news-image-20261121, ROUND 1, Concept A (Polished Classic)

## Model (live leaderboard, 21 Nov ~20:30 WIB)

Rank 1 was samatch-we at 99.19% (12-0-0) with "35 dated stories, 7 regions —
COP31 overtime, Saudi missiles, Peru quake"; rank 2 killingmachine, 30
stories, 7 regions. Cutoff #50 is not settled yet — the board is still
growing (7,675 submissions). The proven shape, from the 20 Nov top 10 and
this board: giant serif date masthead + one-line strap, six-number strip,
per-region bar, three lead cards with data baked into the art, 10 feature
cards, a world map with numbered pins, briefs, and a red-bordered DATE CHECK.
Story count is not the driver (30–35 at the top); the differentiators are
the masthead, Friday's closing prices instead of intraday lows, and
verification chips — all three are in this round.

## Files (all written fresh in-session)

- `main.ts` — entrypoint: republishes the baked `poster/entry.png`
  (validates PNG magic + the 1 MiB cap, prints sha256). Node stdlib only.
- `poster/build.mjs` — reads `poster/data/stories35.json`, writes
  `poster/poster.html`. Contains the layout, the lead/feature SVG art, and
  the hand-built equirectangular world map (continents as lon/lat polygons,
  Black Sea / Caspian / Baltic drawn as sea overlays, Borneo added so the
  Indonesia pin lands on land).
- `poster/render.mjs` — headless Chrome via CDP at 1024×1024, layout probe
  (page exactly 1024 tall, no overflow), then a Pillow RGB re-encode for
  determinism.
- `poster/data/stories35.json` — 35 stories (3 leads, 10 features, 22
  briefs), the six-number strip, the DATE CHECK, the strap. Content facts
  from OneTurn News (21 Nov edition, 49 stories) and Horizon (21 Nov),
  cross-checked: Peru M6.7 is the USGS/IGP figure (GFZ said 6.8), Poland
  is 3 projectiles (2 missiles + a suspected drone), markets are Friday's
  closes.
- `poster/entry.png` — the baked poster, 285,981 bytes, sha256
  `ec92ec564960d83491e6d2b530eeab1b6ca271df8d399a1379afc2160e9011da`.

## Verification

- Pin check (`node poster/build.mjs`): every drawn pin lands on land —
  Kyiv Europe, New York North America, Antalya Europe, Junín South America,
  Riyadh Asia, Brussels Europe, Washington North America, London UK,
  Copenhagen Europe, Berlin Europe, St Louis North America, Indonesia
  Borneo. Story 9 (BepiColombo) is in space — tagged, not pinned.
- Render: 3× byte-identical (285,981 bytes, same sha256 each run).
- Layout probe: page exactly 1024×1024, zero overflowing sections.
- Region bar sums to 35 (Europe 11, Americas 11, Asia-Pacific 3, Mideast 3,
  Africa 4, Oceania 1, World 2).
- `main.ts` test: republishes identical bytes to /tmp/out21 (same sha256).
- Visual QA (read the PNG at full size): masthead, strip, leads, features,
  map, briefs and DATE CHECK all legible; lead art labels no longer cropped
  after the art height was restored to 118px; feature banners shortened so
  no label is cut mid-word; the market chart line was moved down so it no
  longer crosses the "S&P −3.7%" label.

## Known flaws (harsh judge)

1. The map is small (70px tall) and its pins are tiny at 300px — the
   composition reads as a front page first, a map second.
2. Feature and brief decks are truncated with "…" at word boundaries;
   a reader who wants the full sentence has to guess the ending.
3. Lead 1's missile arcs read as decorative rainbows rather than
   trajectories; lead 2's chart is schematic, not a real plot.
4. Europe (11) and the Americas (11) dominate the region bar; Asia-Pacific
   has only 3 stories despite the day's Asian market rout.
