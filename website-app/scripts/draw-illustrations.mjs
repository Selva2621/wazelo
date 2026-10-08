// Generates the homepage's original flat "human" illustrations (400x300 each).
// Usage (from website-app): node scripts/draw-illustrations.mjs public/illustrations
// Animation hooks read by src/components/illustration.tsx:
//   data-anim="wave"  (+ data-origin="x y")  arm group rotates
//   data-anim="sway"  (+ data-origin)         plant sways
//   data-anim="float"                          group drifts up and down
//   data-anim="pulse"                          opacity pulse
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2];
const ACCENT = "#f59e0b"; // floats when used alone; groups use data-anim
const AMBER = "#f6a21c"; // static amber for body-attached details
const C = {
  blob: "#1b1f2c",
  blob2: "#20253a",
  floor: "#2c3248",
  desk: "#3a405a",
  deskLeg: "#2e344a",
  chair: "#2b3146",
  slate: "#5b6385",
  slateDark: "#454c69",
  light: "#d9dce6",
  paper: "#cfd3df",
  ink: "#1a1d27",
  line: "#8a91a5",
  lineDark: "#6b7290",
  green: "#3fa97c",
  leaf: "#4fae84",
  pot: "#b9744a",
  shoe: "#c9ced9",
};
const SKIN = { a: "#f1c9a5", b: "#d6a074", c: "#a86b45", d: "#7a4a2c" };
const HAIR = { brown: "#8a5a3c", auburn: "#b5653a", slate: "#7c84a6", blond: "#d9b26b", black: "#4d4a5c" };

const rect = (x, y, w, h, fill, rx = 0, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${extra}/>`;
const circle = (cx, cy, r, fill, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
const pathEl = (d, fill, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const stroke = (d, color, w, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const g = (inner, attrs = "") => `<g${attrs ? " " + attrs : ""}>${inner}</g>`;

/** Smooth organic blob through jittered points on an ellipse. */
function blob(cx, cy, rx, ry, jitter, fill) {
  const pts = jitter.map((j, i) => {
    const a = (i / jitter.length) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j];
  });
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map((v) => v.toFixed(1))} ${c2.map((v) => v.toFixed(1))} ${p2.map((v) => v.toFixed(1))}`;
  }
  return pathEl(d + "Z", fill);
}

const floor = (y, x1 = 40, x2 = 360) => rect(x1, y, x2 - x1, 3, C.floor, 1.5);

/* ─── Person ─────────────────────────────────────────────────────────────── */

const POSES = {
  down: [[24, 30], [25, 52]],
  hold: [[25, 30], [8, 30]],
  type: [[25, 32], [13, 46]],
  raise: [[30, -4], [34, -28]],
  point: [[36, 8], [56, 2]],
  phone: [[25, 30], [10, 14]],
  shake: [[28, 28], [46, 26]],
  reach: [[32, 6], [48, -10]],
  carry: [[31, -14], [21, -46]],
};

/**
 * o: { x, floor, hipY?, skin, hair, hairStyle, top, bottom, left, right, seated, wave: "left"|"right", collar }
 * Arms: pose names from POSES, mirrored per side.
 */
function person(o) {
  const x = o.x;
  const hipY = o.seated ? o.hipY : o.floor - 58;
  const top = hipY - 56;
  const headY = top - 19;
  const parts = [];

  // long hair falls behind the head and shoulders
  if (o.hairStyle === "long") {
    parts.push(pathEl(`M${x - 15},${headY} Q${x - 16},${headY - 15} ${x},${headY - 15} Q${x + 16},${headY - 15} ${x + 15},${headY} L${x + 17},${top + 22} Q${x},${top + 28} ${x - 17},${top + 22} Z`, o.hair));
  }
  if (!o.seated) {
    parts.push(rect(x - 12, hipY - 2, 11, 60, o.bottom, 5), rect(x + 1, hipY - 2, 11, 60, o.bottom, 5));
    parts.push(`<ellipse cx="${x - 8}" cy="${o.floor - 1}" rx="8.5" ry="3.6" fill="${C.shoe}"/>`, `<ellipse cx="${x + 8}" cy="${o.floor - 1}" rx="8.5" ry="3.6" fill="${C.shoe}"/>`);
  }
  // torso
  parts.push(pathEl(`M${x - 23},${top + 9} Q${x - 23},${top} ${x - 14},${top} L${x + 14},${top} Q${x + 23},${top} ${x + 23},${top + 9} L${x + 19},${hipY} L${x - 19},${hipY} Z`, o.top));
  if (o.collar !== false) parts.push(pathEl(`M${x - 7},${top} L${x},${top + 10} L${x + 7},${top} Z`, o.collar || C.light));

  // arms
  const arm = (side) => {
    const sgn = side === "left" ? -1 : 1;
    const pose = POSES[o[side] || "down"];
    const sx = x + 19 * sgn, sy = top + 8;
    const ex = x + pose[0][0] * sgn, ey = top + pose[0][1];
    const hx = x + pose[1][0] * sgn, hy = top + pose[1][1];
    const body = stroke(`M${sx},${sy} L${ex},${ey} L${hx},${hy}`, o.top, 9.5) + circle(hx, hy, 4.8, o.skin);
    return o.wave === side ? g(body, `data-anim="wave" data-origin="${sx} ${sy}"`) : body;
  };
  parts.push(arm("left"), arm("right"));

  // neck, head, hair
  parts.push(rect(x - 4, top - 7, 8, 9, o.skin, 2), circle(x, headY, 13, o.skin));
  const cap = `M${x - 13.5},${headY + 2} C${x - 15},${headY - 15} ${x + 15},${headY - 17} ${x + 13.8},${headY + 1} C${x + 9},${headY - 7} ${x - 6},${headY - 8} ${x - 13.5},${headY + 2} Z`;
  if (o.hairStyle === "bun") parts.push(pathEl(cap, o.hair), circle(x + 3, headY - 16, 6.5, o.hair));
  else if (o.hairStyle === "curly")
    parts.push(...[[-11, -6], [-5, -12], [3, -13], [10, -8], [13, -1], [-13, 1]].map(([dx, dy]) => circle(x + dx, headY + dy, 6.2, o.hair)));
  else if (o.hairStyle !== "bald") parts.push(pathEl(cap, o.hair));
  return g(parts.join(""));
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

function desk(x1, x2, y, floorY) {
  return rect(x1 + 10, y + 6, 6, floorY - y - 6, C.deskLeg, 2) + rect(x2 - 16, y + 6, 6, floorY - y - 6, C.deskLeg, 2) + rect(x1, y, x2 - x1, 9, C.desk, 3);
}
const chairBack = (x, hipY) => rect(x - 22, hipY - 54, 44, 62, C.chair, 10);
function laptopBack(x, y, w) {
  const h = w * 0.62;
  return rect(x - w / 2, y - h, w, h, "#4b536f", 5) + circle(x, y - h / 2, 4, AMBER) + rect(x - w / 2 - 6, y - 3, w + 12, 5, "#3a405a", 2);
}
function plant(x, floorY, s = 1) {
  const potTop = floorY - 26 * s;
  const leaves = [[-14, -22, -35], [12, -26, 30], [-4, -36, -8], [6, -18, 55], [-16, -10, -60]]
    .map(([dx, dy, rot], i) => `<ellipse cx="${x + dx * s}" cy="${potTop + dy * s}" rx="${6.5 * s}" ry="${15 * s}" fill="${i % 2 ? C.green : C.leaf}" transform="rotate(${rot} ${x + dx * s} ${potTop + dy * s})"/>`)
    .join("");
  return g(leaves, `data-anim="sway" data-origin="${x} ${potTop}"`) + pathEl(`M${x - 13 * s},${potTop} L${x + 13 * s},${potTop} L${x + 10 * s},${floorY} L${x - 10 * s},${floorY} Z`, C.pot);
}
function bubble(x, y, w, h, tone = "amber", lines = 2, tail = "left") {
  const body = tone === "amber" ? ACCENT : "#2f3650";
  const ink = tone === "amber" ? "#7a4a06" : C.line;
  const tx = tail === "left" ? x + 10 : x + w - 18;
  let s = rect(x, y, w, h, body, 8) + pathEl(`M${tx},${y + h - 1} L${tx + 8},${y + h - 1} L${tail === "left" ? tx - 2 : tx + 12},${y + h + 8} Z`, body);
  for (let i = 0; i < lines; i++) s += rect(x + 9, y + 9 + i * 8, (w - 18) * (i === lines - 1 ? 0.6 : 1), 3.5, ink, 1.75);
  return s;
}
const floatGroup = (inner) => g(inner, `data-anim="float"`);
function card(x, y, w, h, accentHeader = false) {
  return rect(x, y, w, h, "#262c3d", 7) + rect(x + 8, y + 8, w * 0.45, 5, accentHeader ? AMBER : C.line, 2.5) + rect(x + 8, y + 18, w - 16, 3.5, C.lineDark, 1.75) + rect(x + 8, y + 25, (w - 16) * 0.7, 3.5, C.lineDark, 1.75);
}
const pin = (x, y, fill = ACCENT) => pathEl(`M${x},${y + 14} C${x - 9},${y + 2} ${x - 9},${y - 9} ${x},${y - 9} C${x + 9},${y - 9} ${x + 9},${y + 2} ${x},${y + 14} Z`, fill) + circle(x, y - 2, 3.4, C.ink);
const check = (x, y, r = 10) => circle(x, y, r, C.green) + stroke(`M${x - r * 0.42},${y} L${x - r * 0.08},${y + r * 0.36} L${x + r * 0.46},${y - r * 0.34}`, C.ink, r * 0.26);
function coin(x, y, fill = ACCENT) {
  return circle(x, y, 9.5, fill) + circle(x, y, 6.6, "#d98a06") + `<text x="${x}" y="${y + 3.4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="${C.ink}">₹</text>`;
}
function sparkle(x, y, r = 6, fill = ACCENT) {
  return pathEl(`M${x},${y - r} Q${x + r * 0.2},${y - r * 0.2} ${x + r},${y} Q${x + r * 0.2},${y + r * 0.2} ${x},${y + r} Q${x - r * 0.2},${y + r * 0.2} ${x - r},${y} Q${x - r * 0.2},${y - r * 0.2} ${x},${y - r} Z`, fill);
}
function star(cx, cy, r, fill = AMBER) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
}
function gear(cx, cy, r, fill = C.slate) {
  let s = "";
  for (let i = 0; i < 8; i++)
    s += `<rect x="${cx - r * 0.22}" y="${cy - r * 1.3}" width="${r * 0.44}" height="${r * 0.5}" rx="2" fill="${fill}" transform="rotate(${i * 45} ${cx} ${cy})"/>`;
  return s + circle(cx, cy, r, fill) + circle(cx, cy, r * 0.42, C.blob);
}
function phone(x, y, w = 40, h = 64) {
  return rect(x, y, w, h, "#2a3144", 8) + rect(x + 4, y + 8, w - 8, h - 14, "#151925", 5);
}
const bolt = (x, y, fill = AMBER) => pathEl(`M${x + 4},${y} L${x - 6},${y + 14} L${x},${y + 14} L${x - 4},${y + 26} L${x + 8},${y + 10} L${x + 2},${y + 10} L${x + 6},${y} Z`, fill);
function clock(x, y, r) {
  return circle(x, y, r, C.light) + stroke(`M${x},${y} L${x},${y - r * 0.6}`, C.ink, 2) + stroke(`M${x},${y} L${x + r * 0.45},${y}`, C.ink, 2);
}
const pulse = (inner) => g(inner, `data-anim="pulse"`);

/* ─── Scenes ─────────────────────────────────────────────────────────────── */

const J = {
  a: [1, 0.92, 1.05, 0.95, 1.08, 0.9, 1.02, 0.94],
  b: [0.95, 1.07, 0.9, 1.04, 0.93, 1.08, 0.97, 1.0],
  c: [1.05, 0.9, 1.0, 1.08, 0.92, 0.98, 1.06, 0.9],
};

const scenes = {
  "freelancer-intro": () => {
    const F = 262;
    return [
      blob(200, 140, 165, 115, J.a, C.blob),
      floor(F),
      plant(62, F, 1.15),
      chairBack(205, 212),
      person({ x: 205, seated: true, hipY: 212, skin: SKIN.b, hair: HAIR.brown, hairStyle: "long", top: C.slate, left: "type", right: "type" }),
      desk(105, 315, 204, F),
      laptopBack(205, 204, 74),
      // mug
      rect(282, 188, 14, 16, C.light, 3) + stroke(`M296,193 Q303,196 296,200`, C.light, 2.5),
      floatGroup(bubble(258, 62, 82, 34, "amber", 2, "left")),
      floatGroup(bubble(78, 92, 70, 30, "slate", 2, "right")),
      floatGroup(sparkle(318, 120, 6) + sparkle(96, 64, 4.5)),
    ];
  },
  find: () => {
    const F = 262;
    // magnifier held in the right hand: hand at (x+48, top-10)
    const x = 140, top = F - 58 - 56;
    const hx = x + 48, hy = top - 10;
    return [
      blob(205, 140, 160, 112, J.b, C.blob),
      floor(F),
      person({ x, floor: F, skin: SKIN.c, hair: HAIR.black, hairStyle: "short", top: C.slateDark, bottom: "#3b4260", left: "down", right: "reach" }),
      g(stroke(`M${hx},${hy} L${hx + 12},${hy - 12}`, C.light, 6) + `<circle cx="${hx + 27}" cy="${hy - 27}" r="19" fill="none" stroke="${AMBER}" stroke-width="7"/>` + circle(hx + 27, hy - 27, 15, "#ffffff", ` fill-opacity="0.08"`)),
      floatGroup(card(244, 70, 104, 38, true) + pin(338, 72)),
      floatGroup(card(258, 122, 96, 38) + pin(346, 124, AMBER)),
      floatGroup(card(244, 174, 104, 38)),
      plant(330, F, 0.9),
    ];
  },
  pitch: () => {
    const F = 262;
    return [
      blob(200, 140, 165, 112, J.c, C.blob),
      floor(F),
      person({ x: 150, floor: F, skin: SKIN.a, hair: HAIR.auburn, hairStyle: "bun", top: C.slate, bottom: "#3b4260", left: "down", right: "shake" }),
      person({ x: 250, floor: F, skin: SKIN.d, hair: HAIR.black, hairStyle: "short", top: "#6b5a8a", bottom: "#3b4260", left: "shake", right: "down", collar: C.light }),
      floatGroup(rect(160, 38, 80, 60, C.paper, 6) + rect(170, 48, 40, 5, AMBER, 2.5) + rect(170, 60, 60, 3.5, C.line, 1.75) + rect(170, 68, 52, 3.5, C.line, 1.75) + stroke(`M170,84 q8,-8 16,0 t16,0`, C.ink, 2) + check(236, 42, 11)),
      plant(64, F, 1),
      floatGroup(sparkle(110, 70, 5) + sparkle(300, 84, 6)),
    ];
  },
  template: () => {
    const F = 262;
    const px = 228, py = 46, pw = 104, ph = 206;
    return [
      blob(205, 145, 160, 112, J.a, C.blob),
      floor(F),
      rect(px, py, pw, ph, "#2a3144", 16) + rect(px + 7, py + 14, pw - 14, ph - 26, "#151925", 10) + rect(px + pw / 2 - 14, py + 6, 28, 4, "#3a4160", 2),
      floatGroup(bubble(px + 14, py + 26, 70, 26, "slate", 2, "left")),
      floatGroup(bubble(px + 22, py + 64, 70, 26, "amber", 2, "right")),
      floatGroup(bubble(px + 14, py + 102, 64, 26, "slate", 2, "left")),
      floatGroup(bubble(px + 22, py + 140, 70, 26, "amber", 2, "right")),
      person({ x: 140, floor: F, skin: SKIN.b, hair: HAIR.blond, hairStyle: "long", top: C.slate, bottom: "#3b4260", left: "down", right: "point" }),
      plant(62, F, 0.95),
    ];
  },
  "follow-up": () => {
    const F = 262;
    const bx = 196, by = 58;
    const cells = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        const cx = bx + 12 + c * 32, cy = by + 30 + r * 30;
        cells.push(rect(cx, cy, 26, 24, "#262c3d", 4));
        if ((r === 0 && c === 0) || (r === 0 && c === 2) || (r === 1 && c === 1)) cells.push(stroke(`M${cx + 7},${cy + 12} l4,4 l8,-8`, C.green, 3));
      }
    return [
      blob(200, 140, 165, 115, J.b, C.blob),
      floor(F),
      rect(bx, by, 152, 128, "#30374f", 10) + rect(bx, by, 152, 20, "#3a4260", 10) + rect(bx + 10, by + 7, 40, 6, C.line, 3) + cells.join(""),
      floatGroup(pathEl(`M330,40 C330,28 346,28 346,40 L349,52 L327,52 Z`, ACCENT) + circle(338, 56, 3.5, ACCENT)),
      g(circle(350, 34, 4.5, "#ef4444"), `data-anim="pulse"`),
      person({ x: 128, floor: F, skin: SKIN.c, hair: HAIR.black, hairStyle: "curly", top: "#4f5a7d", bottom: "#3b4260", left: "down", right: "point" }),
      plant(56, F, 0.9),
    ];
  },
  "get-paid": () => {
    const F = 262;
    const stack = [0, 1, 2, 3].map((i) => `<ellipse cx="290" cy="${F - 8 - i * 9}" rx="20" ry="7" fill="${i % 2 ? "#d98a06" : AMBER}"/>`).join("");
    return [
      blob(200, 140, 160, 112, J.c, C.blob),
      floor(F),
      person({ x: 150, floor: F, skin: SKIN.d, hair: HAIR.slate, hairStyle: "short", top: C.slate, bottom: "#3b4260", left: "down", right: "phone" }),
      rect(150 + 4, F - 114 - 2, 14, 24, "#20253a", 3) + rect(150 + 6, F - 114, 10, 18, AMBER, 2),
      floatGroup(rect(214, 58, 72, 92, C.paper, 6) + rect(224, 70, 34, 5, C.ink, 2.5) + rect(224, 82, 52, 3.5, C.line, 1.75) + rect(224, 90, 44, 3.5, C.line, 1.75) + rect(224, 112, 26, 7, AMBER, 3) + check(280, 60, 11)),
      stack,
      floatGroup(coin(322, 120) + coin(252, 176, ACCENT)),
      floatGroup(sparkle(330, 80, 5)),
    ];
  },
  team: () => {
    const F = 264;
    return [
      blob(200, 138, 170, 116, J.a, C.blob),
      floor(F, 30, 370),
      rect(120, 26, 160, 76, "#2a3144", 10) + rect(130, 38, 50, 5, AMBER, 2.5) + rect(130, 52, 120, 4, C.line, 2) + rect(130, 62, 96, 4, C.line, 2) + rect(130, 72, 110, 4, C.line, 2) + circle(262, 86, 6, C.green) + circle(248, 86, 6, AMBER) + circle(234, 86, 6, C.slate),
      stroke(`M150,102 Q130,118 110,134`, C.lineDark, 2, ` stroke-dasharray="4 5"`) + stroke(`M200,102 L200,126`, C.lineDark, 2, ` stroke-dasharray="4 5"`) + stroke(`M250,102 Q270,118 290,134`, C.lineDark, 2, ` stroke-dasharray="4 5"`),
      person({ x: 105, floor: F, skin: SKIN.a, hair: HAIR.auburn, hairStyle: "long", top: "#6b5a8a", bottom: "#3b4260", left: "down", right: "hold" }),
      person({ x: 200, floor: F, skin: SKIN.c, hair: HAIR.black, hairStyle: "short", top: C.slate, bottom: "#3b4260", left: "down", right: "raise", wave: "right" }),
      person({ x: 295, floor: F, skin: SKIN.b, hair: HAIR.brown, hairStyle: "bun", top: "#4f5a7d", bottom: "#3b4260", left: "hold", right: "down" }),
      floatGroup(bubble(28, 120, 50, 22, "amber", 1, "right")),
      floatGroup(bubble(322, 120, 50, 22, "slate", 1, "left")),
    ];
  },
  toolbox: () => {
    const F = 262;
    const x = 150, top = F - 58 - 56;
    const blocks = [
      [240, F - 32, 32, AMBER], [274, F - 32, 32, C.slate], [308, F - 32, 32, "#4f5a7d"],
      [257, F - 66, 32, C.slateDark], [291, F - 66, 32, AMBER],
    ].map(([bx, by, s, f]) => rect(bx, by, s, s, f, 6) + rect(bx + 8, by + 8, s - 16, 4, "#00000022", 2)).join("");
    return [
      blob(205, 140, 160, 112, J.b, C.blob),
      floor(F),
      blocks,
      person({ x, floor: F, skin: SKIN.b, hair: HAIR.blond, hairStyle: "curly", top: C.slate, bottom: "#3b4260", left: "carry", right: "carry" }),
      floatGroup(rect(x - 20, top - 86, 40, 36, ACCENT, 6) + sparkle(x + 38, top - 84, 5)),
      floatGroup(sparkle(330, 120, 6) + sparkle(70, 90, 4.5)),
    ];
  },
  support: () => {
    const F = 262;
    const hipY = 212, top = hipY - 56, headY = top - 19, x = 200;
    return [
      blob(200, 140, 165, 115, J.c, C.blob),
      floor(F),
      chairBack(x, hipY),
      person({ x, seated: true, hipY, skin: SKIN.d, hair: HAIR.brown, hairStyle: "curly", top: "#4f5a7d", left: "type", right: "type" }),
      // headset
      `<path d="M${x - 15},${headY + 2} Q${x},${headY - 24} ${x + 15},${headY + 2}" fill="none" stroke="${C.light}" stroke-width="3.5" stroke-linecap="round"/>` +
        rect(x - 18, headY - 3, 6, 11, C.light, 3) + rect(x + 12, headY - 3, 6, 11, C.light, 3) +
        stroke(`M${x - 15},${headY + 7} Q${x - 14},${headY + 16} ${x - 4},${headY + 15}`, C.light, 2.5),
      desk(100, 310, 204, F),
      laptopBack(x, 204, 72),
      floatGroup(bubble(70, 66, 84, 32, "slate", 2, "right")),
      floatGroup(bubble(250, 52, 90, 34, "amber", 2, "left")),
      g(circle(334, 188, 5, C.green), `data-anim="pulse"`) + rect(278, 184, 48, 8, "#2a3144", 4),
      plant(330, F, 0.85),
    ];
  },
  success: () => {
    const F = 262;
    const confetti = [[96, 60, AMBER, 20], [140, 40, C.green, -30], [190, 30, "#ef4444", 40], [250, 44, AMBER, -15], [300, 62, C.slate, 25], [330, 96, AMBER, -40], [74, 104, C.slate, 10], [222, 70, C.green, 60]]
      .map(([cx, cy, f, rot]) => `<rect x="${cx}" y="${cy}" width="9" height="5" rx="1.5" fill="${f}" transform="rotate(${rot} ${cx} ${cy})"/>`)
      .join("");
    return [
      blob(200, 140, 165, 115, J.a, C.blob),
      floor(F),
      floatGroup(confetti),
      person({ x: 140, floor: F, skin: SKIN.c, hair: HAIR.black, hairStyle: "long", top: C.slate, bottom: "#3b4260", left: "raise", right: "raise", wave: "left" }),
      person({ x: 262, floor: F, skin: SKIN.a, hair: HAIR.black, hairStyle: "short", top: "#4f5a7d", bottom: "#3b4260", left: "hold", right: "hold" }),
      // trophy held at chest
      pathEl(`M250,${F - 104} L274,${F - 104} Q274,${F - 86} 262,${F - 84} Q250,${F - 86} 250,${F - 104} Z`, AMBER) + rect(259, F - 84, 6, 7, AMBER, 1) + rect(254, F - 78, 16, 5, "#d98a06", 2),
      floatGroup(sparkle(300, 110, 6) + sparkle(96, 140, 5)),
    ];
  },

  /* ─── Feature pages (/features/<slug>) ──────────────────────────────────── */

  "feature-shared-inbox": () => {
    const F = 262;
    const px = 118, py = 34, pw = 164;
    const rows = [0, 1, 2]
      .map((i) => {
        const ry = py + 28 + i * 30, hi = i === 1;
        return rect(px + 10, ry, pw - 20, 24, hi ? "#2f3650" : "#262c3d", 6) + circle(px + 24, ry + 12, 7, [C.green, AMBER, C.slate][i]) + rect(px + 38, ry + 6, 60, 4, hi ? AMBER : C.line, 2) + rect(px + 38, ry + 14, 90, 3.5, C.lineDark, 1.75);
      })
      .join("");
    return [
      blob(200, 140, 168, 114, J.a, C.blob),
      floor(F),
      rect(px, py, pw, 124, "#2a3144", 10) + rect(px + 10, py + 10, 46, 5, AMBER, 2.5) + rows,
      pulse(circle(px + pw - 12, py + 12, 4.5, "#ef4444")),
      person({ x: 72, floor: F, skin: SKIN.a, hair: HAIR.auburn, hairStyle: "long", top: "#6b5a8a", bottom: "#3b4260", left: "down", right: "point" }),
      person({ x: 328, floor: F, skin: SKIN.d, hair: HAIR.black, hairStyle: "short", top: C.slate, bottom: "#3b4260", left: "point", right: "down" }),
      floatGroup(bubble(150, 182, 56, 22, "amber", 1, "left")),
      floatGroup(bubble(214, 196, 50, 22, "slate", 1, "right")),
    ];
  },
  "feature-campaigns": () => {
    const F = 262;
    const phones = [[270, 40], [318, 104], [270, 170]]
      .map(([x, y]) => floatGroup(phone(x, y) + rect(x + 8, y + 16, 22, 10, ACCENT, 4) + rect(x + 8, y + 32, 18, 3.5, C.line, 1.75) + check(x + 38, y + 4, 7)))
      .join("");
    return [
      blob(205, 140, 165, 115, J.b, C.blob),
      floor(F),
      person({ x: 104, floor: F, skin: SKIN.b, hair: HAIR.brown, hairStyle: "bun", top: C.slate, bottom: "#3b4260", left: "down", right: "point" }),
      // megaphone held in the right hand
      rect(146, 141, 14, 18, C.light, 3) + pathEl(`M158,142 L200,120 L200,180 L158,158 Z`, AMBER) + rect(198, 116, 8, 68, "#d98a06", 3),
      stroke(`M216,134 Q226,150 216,166`, AMBER, 3) + stroke(`M230,124 Q244,150 230,176`, AMBER, 3),
      phones,
      plant(48, F, 0.85),
    ];
  },
  "feature-automation": () => {
    const F = 262;
    const node = (x, y, w, inner) => rect(x, y, w, 40, "#262c3d", 8) + inner + rect(x + 36, y + 12, w - 48, 4, C.line, 2) + rect(x + 36, y + 22, (w - 48) * 0.7, 3.5, C.lineDark, 1.75);
    return [
      blob(205, 140, 165, 115, J.c, C.blob),
      floor(F),
      stroke(`M258,66 Q304,66 318,108`, C.lineDark, 2, ` stroke-dasharray="4 5"`) + stroke(`M318,152 Q318,196 258,196`, C.lineDark, 2, ` stroke-dasharray="4 5"`),
      node(176, 46, 82, rect(184, 54, 24, 24, ACCENT, 6) + bolt(196, 53, C.ink)),
      node(276, 110, 84, circle(296, 130, 11, C.green) + stroke(`M291,130 l4,4 l7,-7`, C.ink, 2.5)),
      node(176, 176, 82, rect(184, 184, 24, 24, C.slate, 6) + rect(189, 193, 14, 3.5, C.light, 1.75)),
      floatGroup(gear(340, 54, 12)),
      floatGroup(sparkle(160, 128, 5)),
      person({ x: 96, floor: F, skin: SKIN.c, hair: HAIR.black, hairStyle: "curly", top: "#4f5a7d", bottom: "#3b4260", left: "down", right: "point" }),
    ];
  },
  "feature-analytics": () => {
    const F = 262;
    const bars = [34, 52, 44, 72, 96].map((h, i) => rect(190 + i * 32, 172 - h, 20, h, i === 4 ? AMBER : C.slate, 4)).join("");
    return [
      blob(205, 140, 165, 115, J.a, C.blob),
      floor(F),
      rect(170, 38, 190, 150, "#2a3144", 10) + rect(184, 50, 50, 5, C.line, 2.5) + bars,
      stroke(`M200,126 L232,110 L264,116 L296,90 L330,62`, ACCENT, 3),
      floatGroup(circle(330, 62, 6, ACCENT) + sparkle(352, 34, 5)),
      person({ x: 110, floor: F, skin: SKIN.a, hair: HAIR.blond, hairStyle: "long", top: C.slate, bottom: "#3b4260", left: "down", right: "point" }),
      plant(48, F, 0.9),
    ];
  },
  "feature-contacts": () => {
    const F = 262;
    const contact = (x, y, avatar, tag) =>
      floatGroup(rect(x, y, 120, 40, "#262c3d", 8) + circle(x + 18, y + 20, 10, avatar) + rect(x + 34, y + 11, 48, 5, C.light, 2.5) + rect(x + 34, y + 22, 64, 3.5, C.lineDark, 1.75) + rect(x + 92, y + 10, 22, 9, tag, 4.5));
    return [
      blob(200, 140, 165, 115, J.b, C.blob),
      floor(F),
      contact(62, 66, SKIN.b, AMBER),
      contact(90, 120, SKIN.d, C.green),
      contact(62, 174, SKIN.a, C.slate),
      person({ x: 270, floor: F, skin: SKIN.c, hair: HAIR.slate, hairStyle: "short", top: "#6b5a8a", bottom: "#3b4260", left: "reach", right: "down" }),
      floatGroup(pin(228, 112)),
      plant(348, F, 0.9),
    ];
  },
  "feature-chatbot": () => {
    const F = 262;
    return [
      blob(200, 140, 165, 115, J.c, C.blob),
      floor(F),
      // robot
      stroke(`M280,94 L280,76`, C.light, 3) + pulse(circle(280, 72, 6, ACCENT)),
      rect(258, 226, 14, 34, C.slateDark, 5) + rect(288, 226, 14, 34, C.slateDark, 5),
      `<ellipse cx="265" cy="261" rx="10" ry="3.6" fill="${C.shoe}"/><ellipse cx="295" cy="261" rx="10" ry="3.6" fill="${C.shoe}"/>`,
      stroke(`M252,166 L234,196`, C.slate, 9) + stroke(`M308,166 L326,196`, C.slate, 9),
      rect(248, 150, 64, 80, C.slate, 12) + rect(262, 168, 36, 22, "#151925", 5) + rect(268, 176, 24, 4, AMBER, 2),
      rect(244, 94, 72, 54, "#4f5a7d", 14) + circle(266, 120, 7, C.ink) + circle(294, 120, 7, C.ink),
      pulse(circle(266, 120, 3, AMBER) + circle(294, 120, 3, AMBER)),
      person({ x: 104, floor: F, skin: SKIN.b, hair: HAIR.brown, hairStyle: "long", top: "#4f5a7d", bottom: "#3b4260", left: "down", right: "phone" }),
      rect(104 + 4, F - 116, 14, 24, "#20253a", 3) + rect(104 + 6, F - 114, 10, 18, AMBER, 2),
      floatGroup(bubble(140, 44, 82, 30, "slate", 2, "left")),
      floatGroup(bubble(150, 92, 76, 30, "amber", 2, "right")),
    ];
  },
  "feature-csat": () => {
    const F = 262;
    const stars = [0, 1, 2, 3, 4].map((i) => star(224 + i * 28, 104, 11, i < 4 ? AMBER : C.slateDark)).join("");
    return [
      blob(205, 140, 165, 115, J.a, C.blob),
      floor(F),
      rect(196, 54, 168, 118, "#2a3144", 12) + rect(212, 68, 64, 5, C.line, 2.5) + stars + rect(212, 134, 136, 4, C.lineDark, 2) + rect(212, 144, 96, 4, C.lineDark, 2),
      floatGroup(star(356, 40, 8, ACCENT) + star(180, 44, 6, ACCENT)),
      floatGroup(sparkle(330, 196, 5)),
      person({ x: 110, floor: F, skin: SKIN.d, hair: HAIR.black, hairStyle: "bun", top: C.slate, bottom: "#3b4260", left: "down", right: "raise", wave: "right" }),
      plant(46, F, 0.85),
    ];
  },
  "feature-deals": () => {
    const F = 262;
    const cols = [160, 228, 296];
    const dealCard = (x, y, won = false) => rect(x + 6, y, 46, 26, "#30374f", 5) + rect(x + 12, y + 7, 24, 4, C.line, 2) + rect(x + 12, y + 15, 16, 4, won ? C.green : AMBER, 2);
    const board =
      rect(150, 36, 214, 170, "#2a3144", 10) +
      cols.map((x, i) => rect(x, 48, 30, 5, i === 2 ? C.green : C.line, 2.5) + rect(x, 60, 58, 136, "#262c3d", 6)).join("") +
      dealCard(160, 68) + dealCard(160, 100) + dealCard(228, 68) + dealCard(296, 68, true) + dealCard(296, 100, true) + check(346, 40, 9);
    return [
      blob(205, 140, 168, 115, J.b, C.blob),
      floor(F),
      board,
      person({ x: 92, floor: F, skin: SKIN.a, hair: HAIR.brown, hairStyle: "short", top: "#4f5a7d", bottom: "#3b4260", left: "down", right: "reach" }),
      floatGroup(rect(132, 114, 52, 28, "#30374f", 5) + rect(139, 121, 26, 4, AMBER, 2) + rect(139, 129, 18, 4, C.line, 2)),
      floatGroup(coin(338, 228)),
      plant(40, F, 0.8),
    ];
  },
  "feature-developer-api": () => {
    const F = 262;
    const x = 140, hipY = 212;
    const code = [[0, 52, AMBER], [12, 70, C.line], [12, 44, C.green], [24, 60, C.line], [12, 36, C.slate], [0, 28, AMBER]]
      .map(([indent, w, fill], i) => rect(232 + indent, 66 + i * 13, w, 5, fill, 2.5))
      .join("");
    return [
      blob(200, 140, 168, 115, J.c, C.blob),
      floor(F),
      chairBack(x, hipY),
      person({ x, seated: true, hipY, skin: SKIN.c, hair: HAIR.black, hairStyle: "short", top: C.slate, left: "type", right: "type" }),
      desk(60, 228, 204, F),
      laptopBack(x, 204, 72),
      floatGroup(rect(216, 36, 150, 116, "#151925", 10) + circle(230, 50, 3.5, "#ef4444") + circle(242, 50, 3.5, AMBER) + circle(254, 50, 3.5, C.green) + code),
      floatGroup(rect(286, 182, 66, 46, "#2f3650", 10) + `<text x="319" y="212" text-anchor="middle" font-family="ui-monospace, monospace" font-size="20" font-weight="700" fill="${AMBER}">&lt;/&gt;</text>`),
    ];
  },
  "feature-lead-scoring": () => {
    const F = 262;
    const lead = (x, fill) => floatGroup(rect(x, 188, 76, 28, "#262c3d", 6) + circle(x + 14, 202, 7, fill) + rect(x + 27, 196, 38, 4, C.line, 2) + rect(x + 27, 204, 24, 3.5, C.lineDark, 1.75));
    return [
      blob(205, 140, 165, 115, J.a, C.blob),
      floor(F),
      rect(180, 56, 180, 116, "#2a3144", 12),
      stroke(`M210,152 A60,60 0 0 1 330,152`, C.slateDark, 14),
      stroke(`M210,152 A60,60 0 0 1 312.4,109.6`, AMBER, 14),
      stroke(`M270,152 L302,122`, C.light, 5) + circle(270, 152, 9, C.light),
      lead(190, AMBER),
      lead(276, C.green),
      floatGroup(sparkle(352, 44, 6) + sparkle(170, 40, 4.5)),
      person({ x: 104, floor: F, skin: SKIN.b, hair: HAIR.auburn, hairStyle: "curly", top: "#6b5a8a", bottom: "#3b4260", left: "down", right: "point" }),
    ];
  },
  "feature-multi-channel": () => {
    const F = 262;
    const hx = 258, hy = 140;
    const nodes = [[186, 60, C.green], [334, 62, "#d9467a"], [346, 194, "#4c7bf3"], [250, 236, C.slate]];
    const spokes = nodes.map(([x, y]) => stroke(`M${hx},${hy} L${x},${y}`, C.lineDark, 2, ` stroke-dasharray="4 5"`)).join("");
    const channels = nodes
      .map(([x, y, fill]) => floatGroup(circle(x, y, 19, fill) + rect(x - 9, y - 7, 18, 12, C.light, 4) + pathEl(`M${x - 5},${y + 4} L${x - 7},${y + 10} L${x + 1},${y + 4} Z`, C.light)))
      .join("");
    return [
      blob(210, 140, 165, 115, J.b, C.blob),
      floor(F),
      spokes,
      circle(hx, hy, 38, "#2a3144") + rect(hx - 18, hy - 14, 36, 28, ACCENT, 6) + stroke(`M${hx - 18},${hy - 12} L${hx},${hy + 2} L${hx + 18},${hy - 12}`, C.ink, 2.5),
      channels,
      person({ x: 92, floor: F, skin: SKIN.d, hair: HAIR.slate, hairStyle: "short", top: C.slate, bottom: "#3b4260", left: "down", right: "point" }),
    ];
  },
  "feature-sequences": () => {
    const F = 262;
    return [
      blob(210, 140, 165, 115, J.c, C.blob),
      floor(F),
      stroke(`M150,216 Q192,216 230,154 Q262,102 330,86`, C.lineDark, 2.5, ` stroke-dasharray="5 6"`),
      circle(150, 216, 17, "#2a3144") + check(150, 216, 10),
      circle(230, 154, 17, "#2a3144") + clock(230, 154, 10),
      circle(330, 86, 17, "#2a3144") + rect(320, 79, 20, 14, ACCENT, 4),
      floatGroup(bubble(168, 168, 52, 22, "slate", 1, "left")),
      floatGroup(bubble(250, 104, 52, 22, "amber", 1, "left")),
      floatGroup(bubble(300, 36, 60, 24, "amber", 1, "right")),
      person({ x: 76, floor: F, skin: SKIN.a, hair: HAIR.blond, hairStyle: "bun", top: "#4f5a7d", bottom: "#3b4260", left: "down", right: "point" }),
    ];
  },
};

fs.mkdirSync(out, { recursive: true });
for (const [name, build] of Object.entries(scenes)) {
  const body = build().join("\n  ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">\n  ${body}\n</svg>\n`;
  fs.writeFileSync(path.join(out, `${name}.svg`), svg);
  console.log(`${name}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}
