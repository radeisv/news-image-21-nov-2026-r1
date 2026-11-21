# The World in One Day — Saturday 21 November 2026

[![make.fun · news-image-20261121](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![rank](https://make.fun/badge/news-image-20261121/radeisv/news-image-21-nov-2026-r1/rank.svg)](https://make.fun/bounty/news-image-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![reward](https://make.fun/badge/news-image-20261121/radeisv/news-image-21-nov-2026-r1/reward.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)

One page. 35 stories. Saturday 21 November 2026, as a newspaper front page.

## What it is

A 1024×1024 poster summing up the day's world news, built from live
leaderboard analysis: rank 1 was samatch-we at 99.19% with 35 dated stories
across 7 regions. This entry follows that proven shape — a giant serif date
masthead, a six-number market strip, a per-region bar, three lead cards with
data baked into the art, ten feature cards, a world map with numbered pins,
22 briefs, and a red-bordered DATE CHECK that quarantines earlier news.

## Facts that must not be wrong

- **Russia / Poland**: more than 400 drones and 110 missiles fired
  overnight; at least 8 killed in Kyiv; two missiles and a suspected drone
  came down in eastern Poland; Tusk called it a deliberate provocation.
- **Markets are Friday's closes** (first reported Saturday): S&P 500 −3.7%,
  Nasdaq −5.28%, Nikkei −5.1%, gold −4.6%, Bitcoin about $57,850.
- **Peru quake**: M6.7 (USGS / IGP), 30 km NW of Junín, 19:09 local time
  (00:09 UTC Saturday); no deaths, minor damage to homes. GFZ said 6.8 —
  the poster uses the USGS/IGP figure.
- **COP31**: passed its Friday deadline with no deal; fossil-fuel deadlock
  in Antalya, nearly 200 nations split.
- **DATE CHECK**: the Shenzhen Trump–Xi–Putin meeting itself, the ICJ
  Rohingya ruling, Anthropic's $83 IPO pricing, the Senate's 48–51 Iran
  vote, Cyclone Akvan's landfall, GTA VI's launch and Japan's 2.2% core CPI
  were all first reported before Saturday, so they are excluded.

## Build

```sh
node poster/build.mjs    # poster/data/stories35.json -> poster/poster.html
node poster/render.mjs   # poster/poster.html -> poster/entry.png (1024x1024)
```

`render.mjs` screenshots the page in headless Chrome and re-encodes it as
RGB with Pillow, so repeated runs are byte-identical. `main.ts` republishes
the baked `poster/entry.png` unchanged at grade time.

## Verification chips

Each card carries a chip: **CONFIRMED** (2+ outlets), **OFFICIAL** (on the
record), **REPORTED** (one outlet), **ONGOING**, **EARLY TRIAL** or **CLAIM**
(treat with care). The legend is in the footer.
