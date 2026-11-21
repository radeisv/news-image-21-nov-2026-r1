// build.mjs — news-image-20261121, ROUND 1, Concept A (Polished Classic).
// Written fresh in this session. Reads poster/data/stories35.json and writes
// poster/poster.html — one 1024x1024 newspaper front page for Saturday
// 21 November 2026. All pictures are inline SVG drawn in code; the map is a
// hand-built equirectangular world, continents as lon/lat polygons, with the
// lead + feature pins projected from the same story data so a pin cannot
// drift away from its place. Node stdlib only; no network.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(dir, "data", "stories35.json"), "utf8"));
const stories = data.stories;
const leads = stories.filter((s) => s.n <= 3);
const feats = stories.filter((s) => s.n >= 4 && s.n <= 13);
const briefs = stories.filter((s) => s.n >= 14);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const trunc = (s, n) => { if (s.length <= n) return s; const cut = s.slice(0, n - 1); const sp = cut.lastIndexOf(" "); return (sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…"; };

// ---- map geometry: equirectangular, viewBox 0 0 360 140 (lon -180..180, lat 85..-55)
const proj = (lon, lat) => [lon + 180, 85 - lat];
const polyPath = (pts) => pts.map(([lo, la], i) => `${i ? "L" : "M"}${proj(lo, la)[0].toFixed(1)},${proj(lo, la)[1].toFixed(1)}`).join(" ") + " Z";
const inPoly = (x, y, pts) => {
  const p = pts.map(([lo, la]) => proj(lo, la));
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// Simplified but recognisable continent outlines, lon/lat pairs.
const CONTINENTS = [
  { name: "North America", pts: [[-168,66],[-154,58],[-144,60],[-133,56],[-125,49],[-122,37],[-115,31],[-107,24],[-98,17],[-90,14],[-83,9],[-79,11],[-81,21],[-80,31],[-76,36],[-73,41],[-67,45],[-60,47],[-55,52],[-62,58],[-70,60],[-78,62],[-86,66],[-94,67],[-103,68],[-113,69],[-123,70],[-133,69],[-143,70],[-153,71],[-163,70],[-167,68]] },
  { name: "Greenland", pts: [[-55,60],[-44,60],[-35,66],[-25,70],[-18,76],[-30,80],[-46,77],[-56,72],[-58,67],[-57,63]] },
  { name: "South America", pts: [[-79,9],[-77,6],[-80,-2],[-80,-8],[-74,-16],[-70,-23],[-71,-33],[-73,-43],[-74,-48],[-70,-54],[-66,-51],[-62,-42],[-57,-35],[-51,-30],[-44,-23],[-39,-18],[-35,-9],[-37,-4],[-43,-2],[-50,0],[-56,6],[-62,9],[-68,11],[-75,11],[-77,10]] },
  { name: "Africa", pts: [[-17,15],[-15,24],[-10,30],[-2,35],[6,37],[12,34],[20,32],[30,31],[35,28],[39,20],[43,12],[51,11],[47,5],[42,-2],[40,-10],[36,-18],[33,-26],[28,-32],[20,-35],[15,-28],[12,-18],[12,-14],[9,-4],[9,4],[2,6],[-6,4],[-13,8],[-17,14],[-16,20]] },
  { name: "Europe", pts: [[-9,37],[-8,43],[-4,48],[0,50],[3,52],[7,54],[10,57],[7,60],[5,63],[11,65],[17,69],[25,69],[30,70],[30,61],[31,52],[32,46],[33,44],[39,44],[36,37],[30,36],[27,36],[27,40],[24,41],[22,39],[20,39],[18,41],[15,44],[12,44],[9,44],[6,43],[3,42],[1,39],[-1,37],[-4,36],[-6,36]] },
  { name: "UK", pts: [[-5,50],[-1,51],[1,52],[0,53],[-3,55],[-5,58],[-6,55],[-5,51]] },
  { name: "Asia", pts: [[36,36],[36,28],[39,19],[43,13],[48,14],[54,16],[59,20],[58,25],[54,26],[61,25],[67,25],[72,21],[77,11],[80,8],[85,17],[91,22],[95,16],[100,8],[103,2],[107,11],[109,14],[106,20],[112,22],[118,25],[121,31],[122,39],[127,40],[132,43],[138,46],[141,51],[141,57],[147,59],[156,56],[161,58],[169,61],[178,66],[170,69],[160,70],[145,72],[130,72],[115,74],[100,77],[85,74],[70,71],[58,65],[52,53],[47,44],[41,41],[36,38]] },
  { name: "Japan", pts: [[130,31],[133,34],[137,35],[140,37],[141,41],[142,44],[140,40],[137,35],[132,33]] },
  { name: "Borneo", pts: [[109,-1],[111,1],[113,4],[117,6],[119,1],[117,-3],[114,-4],[110,-3]] },
  { name: "Australia", pts: [[114,-22],[114,-32],[118,-35],[124,-33],[130,-32],[138,-35],[142,-39],[147,-39],[153,-32],[153,-24],[149,-20],[143,-15],[141,-13],[137,-18],[132,-12],[127,-14],[122,-17],[117,-20]] },
  { name: "NZ North", pts: [[174,-37],[178,-38],[176,-41],[174,-41],[173,-38]] },
  { name: "NZ South", pts: [[167,-45],[171,-42],[174,-42],[170,-46],[168,-46]] },
];
const SEAS = [
  { name: "Black Sea", pts: [[28,41],[33,42],[39,41],[41,41],[36,44],[30,43],[28,42]] },
  { name: "Caspian", pts: [[47,47],[51,44],[53,42],[52,37],[49,39],[46,44]] },
  { name: "Baltic", pts: [[18,56],[22,59],[22,61],[18,60],[18,57]] },
];
const pinLand = (lat, lon) => {
  if (lat == null || lon == null) return "space";
  const [x, y] = proj(lon, lat);
  for (const c of CONTINENTS) if (inPoly(x, y, c.pts)) return c.name;
  return "sea";
};
for (const s of [...leads, ...feats]) {
  console.log(`PIN ${s.n} ${s.place}: ${pinLand(s.lat, s.lon)}`);
}

// ---- lead art: 300x118 scenes, data labels baked into the drawing ----
const leadArt = (s) => {
  if (s.n === 1) {
    // Kyiv at night: dark sky, skyline, three bridges over the Dnipro, missile arcs.
    let arcs = "";
    for (let i = 0; i < 4; i++) {
      const x0 = 20 + i * 70, y0 = 108, x1 = x0 + 45, y1 = 30 + (i % 2) * 14;
      arcs += `<path d="M${x0},${y0} Q${x0 + 22},${y1 - 18} ${x1},${y1}" stroke="#ffb454" stroke-width="2" fill="none"/><circle cx="${x1}" cy="${y1}" r="3" fill="#ffdf8a"/>`;
    }
    return `<svg viewBox="0 0 300 118" width="100%" height="118" preserveAspectRatio="xMidYMid slice"><rect width="300" height="118" fill="#101c33"/><rect y="82" width="300" height="36" fill="#1d3a5f"/><path d="M0,82 L0,60 L18,60 L18,48 L34,48 L34,66 L52,66 L52,40 L68,40 L68,58 L88,58 L88,70 L108,70 L108,46 L126,46 L126,62 L146,62 L146,52 L166,52 L166,68 L188,68 L188,44 L206,44 L206,60 L226,60 L226,70 L246,70 L246,54 L264,54 L264,66 L282,66 L282,76 L300,76 L300,82 Z" fill="#0a1424"/>${arcs}<text x="10" y="22" fill="#fff" font-size="15" font-weight="bold" font-family="Arial">400+ DRONES · 110 MISSILES</text><text x="10" y="40" fill="#ffb454" font-size="12" font-weight="bold" font-family="Arial">3 PROJECTILES HIT POLAND</text></svg>`;
  }
  if (s.n === 2) {
    // Falling market chart: red bars stepping down, S&P line.
    const bars = [96, 84, 88, 70, 76, 58, 62, 44, 48, 30];
    let b = bars.map((h, i) => `<rect x="${12 + i * 28}" y="${104 - h}" width="20" height="${h}" fill="${i % 2 ? "#c0392b" : "#e74c3c"}"/>`).join("");
    return `<svg viewBox="0 0 300 118" width="100%" height="118" preserveAspectRatio="xMidYMid slice"><rect width="300" height="118" fill="#f7ead9"/><line x1="8" y1="104" x2="292" y2="104" stroke="#111" stroke-width="2"/>${b}<polyline points="20,30 48,38 76,34 104,50 132,46 160,62 188,58 216,74 244,70 272,86" stroke="#111" stroke-width="3" fill="none"/><text x="10" y="20" fill="#b91c1c" font-size="16" font-weight="bold" font-family="Arial">S&amp;P −3.7%</text><text x="150" y="20" fill="#111" font-size="13" font-weight="bold" font-family="Arial">NASDAQ −5.28%</text><text x="10" y="100" fill="#111" font-size="10" font-family="Arial">FRIDAY'S CLOSE · NIKKEI −5.1% · GOLD −4.6%</text></svg>`;
  }
  // COP31: Antalya coast, sun stuck behind a clock, overtime banner.
  return `<svg viewBox="0 0 300 118" width="100%" height="118" preserveAspectRatio="xMidYMid slice"><rect width="300" height="118" fill="#ffe9b0"/><circle cx="150" cy="52" r="30" fill="#f59e0b"/><rect y="78" width="300" height="40" fill="#0e7490"/><path d="M0,78 Q75,62 150,78 T300,78 L300,118 L0,118 Z" fill="#155e75"/><circle cx="248" cy="34" r="22" fill="#fff" stroke="#111" stroke-width="3"/><line x1="248" y1="34" x2="248" y2="18" stroke="#111" stroke-width="3"/><line x1="248" y1="34" x2="260" y2="40" stroke="#111" stroke-width="3"/><text x="10" y="22" fill="#7c2d12" font-size="15" font-weight="bold" font-family="Arial">OVERTIME IN ANTALYA</text><text x="10" y="40" fill="#7c2d12" font-size="12" font-weight="bold" font-family="Arial">NO DEAL YET · ~200 NATIONS</text></svg>`;
};

// ---- feature art: wide data banner, colour by kicker ----
const featColour = (k) => ({ WAR: "#7f1d1d", MARKETS: "#7c2d12", CLIMATE: "#14532d", DISASTER: "#7c2d12", CONFLICT: "#7f1d1d", EUROPE: "#1e3a8a", CYBER: "#312e81", HEALTH: "#831843", SPACE: "#1e1b4b", SOCIETY: "#78350f", JUSTICE: "#334155" }[k] || "#334155");
const featArt = (s) => {
  const c = featColour(s.kicker);
  const label = esc(s.banner || s.kicker);
  return `<svg viewBox="0 0 150 52" width="150" height="52" preserveAspectRatio="xMidYMid slice"><rect width="150" height="52" fill="${c}"/><text x="75" y="22" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle" font-family="Arial">${label.slice(0, 16)}</text><text x="75" y="40" fill="#fde68a" font-size="10" font-weight="bold" text-anchor="middle" font-family="Arial">${label.length > 16 ? esc(label.slice(16, 34)) : esc(s.kicker)}</text></svg>`;
};

const chipColour = (v) => ({ CONFIRMED: "#166534", OFFICIAL: "#1e40af", REPORTED: "#92400e", ONGOING: "#9f1239", "EARLY TRIAL": "#6d28d9", CLAIM: "#6d28d9" }[v] || "#334155");
const chip = (v) => `<span class="chip" style="background:${chipColour(v)}">${esc(v)}</span>`;

// ---- page ----
const stripHtml = data.meta.strip.map(([k, v]) => `<div class="num"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("");
const regionHtml = data.meta.regions.map(([r, n]) => `<span><b>${esc(r)}</b> ${n}</span>`).join("<i>·</i>");
const leadsHtml = leads.map((s) => `
  <article class="lead">
    <div class="art">${leadArt(s)}</div>
    <div class="krow"><span class="kick">${esc(s.kicker)}</span>${chip(s.ver)}<span class="no">${s.n}</span></div>
    <h2>${esc(s.title)}</h2>
    <p>${esc(s.deck)}</p>
    <div class="src">${esc(s.place)} — ${esc(s.source)}</div>
  </article>`).join("");
const featsHtml = feats.map((s) => `
  <article class="feat">
    <div class="fart">${featArt(s)}</div>
    <div class="fbody"><div class="krow"><span class="kick">${esc(s.kicker)}</span>${chip(s.ver)}<span class="no">${s.n}</span></div>
    <h3>${esc(s.title)}</h3><p>${esc(trunc(s.deck, 82))}</p>
    <div class="src">${esc(s.place)} — ${esc(s.source)}</div></div>
  </article>`).join("");
const pins = [...leads, ...feats].filter((s) => s.lat != null).map((s) => {
  const [x, y] = proj(s.lon, s.lat);
  return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#b91c1c" stroke="#fff" stroke-width="1.5"/><text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="#fff" font-size="8" font-weight="bold" text-anchor="middle" font-family="Arial">${s.n}</text></g>`;
}).join("");
const mapSvg = `<svg viewBox="0 0 360 140" width="100%" height="70" preserveAspectRatio="xMidYMid meet"><rect width="360" height="140" fill="#dbeafe"/>${CONTINENTS.map((c) => `<path d="${polyPath(c.pts)}" fill="#e7d8b0" stroke="#8a7d5a" stroke-width="0.7"/>`).join("")}${SEAS.map((c) => `<path d="${polyPath(c.pts)}" fill="#dbeafe" stroke="none"/>`).join("")}${pins}</svg>`;
const briefsHtml = briefs.map((s) => `<p><b>${s.n}. ${esc(s.title)}</b> — ${esc(trunc(s.deck, 48))}</p>`).join("");

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
.page{width:1024px;height:1024px;background:#fdf8ec;color:#111;font-family:Arial,Helvetica,sans-serif;padding:10px 16px 4px;overflow:hidden}
header{text-align:center;border-bottom:4px double #111;padding-bottom:4px}
header .top{font-size:10px;letter-spacing:3px;font-weight:bold}
header h1{font-family:Georgia,serif;font-size:37px;line-height:1.02;letter-spacing:-0.5px}
header .strap{font-size:12px;font-weight:bold;color:#b91c1c;margin-top:2px}
header .corner{font-size:9px;letter-spacing:1.5px;color:#444;margin-top:2px}
.strip{display:flex;border-bottom:2px solid #111;padding:3px 0}
.num{flex:1;text-align:center;border-right:1px solid #999}.num:last-child{border-right:none}
.num b{display:block;font-size:9px;letter-spacing:1px;color:#555}.num span{font-size:15px;font-weight:bold}
.regions{display:flex;justify-content:center;gap:6px;font-size:9px;padding:2px 0;border-bottom:1px solid #999}
.regions b{color:#b91c1c}.regions i{color:#999;font-style:normal}
.leads{display:flex;gap:10px;padding:5px 0 4px;border-bottom:2px solid #111}
.lead{flex:1}.art{border:1px solid #111}.art svg{display:block;height:118px}
.krow{display:flex;align-items:center;gap:6px;margin:4px 0 2px}
.kick{font-size:9px;font-weight:bold;letter-spacing:1px;color:#b91c1c}
.chip{font-size:8px;font-weight:bold;color:#fff;padding:1px 5px;border-radius:2px}
.no{margin-left:auto;font-size:11px;font-weight:bold;color:#fff;background:#111;border-radius:50%;width:16px;height:16px;line-height:16px;text-align:center}
.lead h2{font-family:Georgia,serif;font-size:17px;line-height:1.12}
.lead p{font-size:10.5px;line-height:1.3;margin-top:2px}
.src{font-size:8px;color:#555;margin-top:2px;letter-spacing:0.4px}
.feats{display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;padding:3px 0;border-bottom:2px solid #111}
.feat{display:flex;gap:8px;min-height:48px}
.fart{flex:0 0 150px;border:1px solid #111}.fart svg{display:block;height:44px}
.fbody{flex:1}.fbody .krow{margin:0 0 1px}
.feat h3{font-family:Georgia,serif;font-size:12.5px;line-height:1.1}
.feat p{font-size:9px;line-height:1.25;margin-top:1px}
.maprow{padding:4px 0 1px;border-bottom:2px solid #111}
.maprow .maptitle{font-size:10px;font-weight:bold;letter-spacing:1.5px}
.briefs{display:grid;grid-template-columns:1fr 1fr;gap:1px 14px;padding:4px 0}
.briefs p{font-size:8px;line-height:1.15}
.briefs b{color:#111}
.datecheck{border:2px solid #b91c1c;padding:4px 8px;margin-top:3px}
.datecheck b{color:#b91c1c;font-size:10px;letter-spacing:1px}
.datecheck p{font-size:9px;line-height:1.25;margin-top:1px}
footer{display:flex;justify-content:space-between;font-size:8.5px;color:#555;padding-top:3px}
</style></head><body><div class="page">
<header><div class="top">THE WORLD IN ONE DAY</div><h1>${esc(data.meta.date)}</h1><div class="strap">${esc(data.meta.strap)}</div><div class="corner">${esc(data.meta.corner)}</div></header>
<div class="strip">${stripHtml}</div>
<div class="regions">${regionHtml}</div>
<section class="leads">${leadsHtml}</section>
<section class="feats">${featsHtml}</section>
<section class="maprow"><div class="maptitle">WHERE IT HAPPENED — STORIES 1–13 PINNED</div>${mapSvg}</section>
<section class="briefs">${briefsHtml}</section>
<section class="datecheck"><b>DATE CHECK — NOT SATURDAY'S NEWS</b><p>${esc(data.meta.datecheck)}</p></section>
<footer><span>Chips: CONFIRMED 2+ outlets · OFFICIAL on the record · REPORTED one outlet · ONGOING · EARLY TRIAL / CLAIM — treat with care</span><span>All 35 stories first reported Saturday 21 November 2026, in at least one time zone.</span></footer>
</div></body></html>`;
writeFileSync(join(dir, "poster.html"), html);
console.log("WROTE poster.html", html.length, "bytes; stories", stories.length);
