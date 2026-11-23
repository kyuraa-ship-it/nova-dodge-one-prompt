// NOVA DODGE — a tiny browser game built from one prompt.
//
// The one prompt this game was built from:
//   "Build a tiny browser game: a spaceship dodges falling asteroids and
//    collects stars. Arrow keys or WASD to move, +10 points per star,
//    3 lives, game over on hit, press R to restart.
//    One HTML file, canvas, no dependencies."
//
// Deterministic: a fixed seed drives every spawn, so the same seed plays
// the same game every time. The browser build and the headless frame
// renderer in this repo run the exact same step() below.
//
// No dependencies, no network, no wall clock inside the simulation:
// step() advances a fixed 1/60 s tick and takes its input as an argument.

export const WORLD_W = 540;
export const WORLD_H = 960;
export const TICK = 1 / 60;
export const SEED = 20261122;

// mulberry32 — a small deterministic PRNG.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame(seed = SEED) {
  const rand = mulberry32(seed);
  return {
    seed,
    rand,
    time: 0,
    score: 0,
    lives: 3,
    over: false,
    ship: { x: WORLD_W / 2, y: 860, vx: 0, w: 54, h: 42 },
    asteroids: [],
    stars: [],
    spawnAsteroidIn: 0.4,
    spawnStarIn: 0.7,
    invulnerableUntil: 0,
    flash: 0,
    collected: 0,
    dodged: 0,
  };
}

// input: { left: bool, right: bool } — keyboard in the browser,
// autopilot in the headless renderer. One fixed tick per call.
export function step(g, input) {
  if (g.over) return;
  g.time += TICK;
  const ship = g.ship;

  // Ship movement.
  const speed = 420;
  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  ship.vx = dir * speed;
  ship.x += ship.vx * TICK;
  if (ship.x < 30) ship.x = 30;
  if (ship.x > WORLD_W - 30) ship.x = WORLD_W - 30;

  // Difficulty ramps gently with time.
  const ramp = 1 + Math.min(g.time / 60, 1) * 0.8;

  // Spawn asteroids.
  g.spawnAsteroidIn -= TICK;
  if (g.spawnAsteroidIn <= 0) {
    const r = 16 + g.rand() * 22;
    g.asteroids.push({
      x: 30 + g.rand() * (WORLD_W - 60),
      y: -r,
      r,
      vy: (150 + g.rand() * 110) * ramp,
      rot: g.rand() * Math.PI * 2,
      vr: (g.rand() - 0.5) * 2,
    });
    g.spawnAsteroidIn = 0.62 / ramp + g.rand() * 0.25;
  }

  // Spawn stars.
  g.spawnStarIn -= TICK;
  if (g.spawnStarIn <= 0) {
    g.stars.push({
      x: 30 + g.rand() * (WORLD_W - 60),
      y: -20,
      vy: 170 * ramp,
      phase: g.rand() * Math.PI * 2,
    });
    g.spawnStarIn = 0.8 + g.rand() * 0.5;
  }

  // Move asteroids.
  for (let i = g.asteroids.length - 1; i >= 0; i--) {
    const a = g.asteroids[i];
    a.y += a.vy * TICK;
    a.rot += a.vr * TICK;
    if (a.y - a.r > WORLD_H) {
      g.asteroids.splice(i, 1);
      g.dodged += 1;
    }
  }

  // Move stars.
  for (let i = g.stars.length - 1; i >= 0; i--) {
    const s = g.stars[i];
    s.y += s.vy * TICK;
    s.phase += TICK * 4;
    if (s.y > WORLD_H + 20) g.stars.splice(i, 1);
  }

  // Star pickup: +10.
  for (let i = g.stars.length - 1; i >= 0; i--) {
    const s = g.stars[i];
    const dx = s.x - ship.x;
    const dy = s.y - ship.y;
    if (dx * dx + dy * dy < 46 * 46) {
      g.stars.splice(i, 1);
      g.score += 10;
      g.collected += 1;
    }
  }

  // Asteroid hit: lose a life, brief invulnerability.
  if (g.time > g.invulnerableUntil) {
    for (let i = g.asteroids.length - 1; i >= 0; i--) {
      const a = g.asteroids[i];
      const dx = Math.max(Math.abs(a.x - ship.x) - ship.w / 2, 0);
      const dy = Math.max(Math.abs(a.y - ship.y) - ship.h / 2, 0);
      if (dx * dx + dy * dy < a.r * a.r * 0.55) {
        g.asteroids.splice(i, 1);
        g.lives -= 1;
        g.flash = 0.25;
        g.invulnerableUntil = g.time + 1.2;
        if (g.lives <= 0) g.over = true;
        break;
      }
    }
  }

  if (g.flash > 0) g.flash -= TICK;
}

// Deterministic autopilot, used by the headless renderer (and only there):
// chase the nearest star, dodge any asteroid closing in above the ship.
export function autopilot(g) {
  const ship = g.ship;
  let targetX = ship.x;
  let nearest = Infinity;
  for (const s of g.stars) {
    if (s.y > ship.y - 40) continue;
    const d = Math.abs(s.x - ship.x) + (ship.y - s.y) * 0.15;
    if (d < nearest) {
      nearest = d;
      targetX = s.x;
    }
  }
  for (const a of g.asteroids) {
    const dy = ship.y - a.y;
    if (dy > 0 && dy < 190 && Math.abs(a.x - ship.x) < 70) {
      targetX = a.x < ship.x ? ship.x + 130 : ship.x - 130;
      break;
    }
  }
  if (targetX > WORLD_W - 30) targetX = WORLD_W - 30;
  if (targetX < 30) targetX = 30;
  const dead = 6;
  return {
    left: targetX < ship.x - dead,
    right: targetX > ship.x + dead,
  };
}

// --- tiny 3x5 bitmap font, for the in-game HUD (score / lives) --------
const GLYPHS = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '110', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  '-': ['000', '000', '111', '000', '000'],
  '+': ['000', '010', '111', '010', '000'],
  '.': ['000', '000', '000', '000', '010'],
  ' ': ['000', '000', '000', '000', '000'],
};

export function drawBitmapText(ctx, text, x, y, scale, color) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of String(text).toUpperCase()) {
    const glyph = GLYPHS[ch] || GLYPHS[' '];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (glyph[row][col] === '1') {
          ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
        }
      }
    }
    cx += 4 * scale;
  }
}

// Draw one frame. ctx only needs fillStyle, fillRect, and
// beginPath/arc/fill — both a browser canvas and the headless
// software renderer in video/render-frames.mjs provide them.
export function draw(g, ctx) {
  // Space background.
  ctx.fillStyle = '#0b1026';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Distant stars (fixed positions from the seed).
  ctx.fillStyle = '#8fa3c8';
  const bgRand = mulberry32(7);
  for (let i = 0; i < 70; i++) {
    const x = bgRand() * WORLD_W;
    const y = bgRand() * WORLD_H;
    const s = bgRand() < 0.8 ? 2 : 3;
    ctx.fillRect(x, y, s, s);
  }

  // Collectible stars (4-point sparkle).
  for (const s of g.stars) {
    const tw = 0.6 + 0.4 * Math.sin(s.phase);
    const r = 13 * tw + 4;
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(s.x - r, s.y - 3, r * 2, 6);
    ctx.fillRect(s.x - 3, s.y - r, 6, r * 2);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
  }

  // Asteroids (grey, cratered).
  for (const a of g.asteroids) {
    ctx.fillStyle = '#7d8597';
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b6272';
    ctx.beginPath();
    ctx.arc(a.x - a.r * 0.3, a.y - a.r * 0.2, a.r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(a.x + a.r * 0.35, a.y + a.r * 0.3, a.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ship (gold triangle + cyan engine glow), blinking while invulnerable.
  const blink = g.time < g.invulnerableUntil && Math.floor(g.time * 12) % 2 === 0;
  if (!blink) {
    const s = g.ship;
    ctx.fillStyle = '#2dd4ff';
    ctx.fillRect(s.x - 4, s.y + s.h / 2 - 2, 8, 16);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(s.x, s.y - s.h / 2 + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(s.x - s.w / 2, s.y - 4, s.w, 12);
    ctx.fillStyle = '#f5efe0';
    ctx.fillRect(s.x - 6, s.y - s.h / 2, 12, s.h - 6);
  }

  // Hit flash.
  if (g.flash > 0) {
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  // HUD: score top-left, lives top-right (little ships).
  // Kept below y=90 so a video caption strip across the top never covers it.
  drawBitmapText(ctx, 'SCORE ' + String(g.score).padStart(4, '0'), 18, 100, 4, '#f5efe0');
  for (let i = 0; i < 3; i++) {
    const x = WORLD_W - 30 - i * 30;
    ctx.fillStyle = i < g.lives ? '#ffd23f' : '#3a4157';
    ctx.fillRect(x - 9, 104, 18, 8);
    ctx.fillRect(x - 3, 96, 6, 16);
  }

  if (g.over) {
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(60, 380, WORLD_W - 120, 200);
    drawBitmapText(ctx, 'GAME OVER', 130, 420, 6, '#ff6b6b');
    drawBitmapText(ctx, 'SCORE ' + g.score, 165, 470, 5, '#f5efe0');
    drawBitmapText(ctx, 'PRESS R', 185, 520, 5, '#2dd4ff');
  }
}
