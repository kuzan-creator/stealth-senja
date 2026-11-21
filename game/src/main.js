// "Shadows of Pasar Senja" — top-down stealth heist in three Indonesian
// night locations. Sneak through guard vision cones, hide in shadows, steal
// every pusaka, then reach the exit. Detection fills a guard's meter: slow
// in shadow, slower while sneaking, faster in lamplight and up close. A
// full meter means a chase; get caught three times and the mission fails.
import { LEVELS, TILE, COLS, ROWS } from './levels.js';
import { drawScene, canSee, inShadow, litByLamp, tileAt } from './render.js';
import { bindInput } from './input.js';
import { parseShot, stageShot } from './shots.js';
import {
  playPickup, playCoin, playSuspicious, playAlarm, playCaught, playWin,
  playStep, setMuted, isMuted,
} from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

const state = {
  levelIndex: 0,
  level: LEVELS[0],
  phase: 'menu', // menu | play | caught | levelClear | gameOver | win
  frozen: false,
  now: 0,
  player: { x: 60, y: 60, dir: -Math.PI / 2, sneak: false, moving: false },
  guards: [],
  dogs: [],
  cameras: [],
  searchlight: null,
  searchMeter: 0,
  lamps: [],
  items: [],
  exit: { x: 0, y: 0, open: false },
  coins: [],
  coinsLeft: 5,
  score: 0,
  lives: 3,
  timeLeft: 180,
  alert: 'calm',
  message: 'Tetap di bayangan. Penjaga sedang berpatroli.',
  ghost: true, // true until any guard fully spots the player this level
  caughtAt: 0,
  stepAt: 0,
  titleCard: false, // cover-shot title band drawn on the canvas
};

function tileCenter(t) {
  return t * TILE + TILE / 2;
}

function findTile(ch) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (state.level.map[ty][tx] === ch) return [tx, ty];
    }
  }
  return [1, 1];
}

function loadLevel(index) {
  state.levelIndex = index;
  state.level = LEVELS[index];
  const lv = state.level;
  const [px, py] = findTile('P');
  const [ex, ey] = findTile('E');
  state.player = { x: tileCenter(px), y: tileCenter(py), dir: Math.PI / 2, sneak: false, moving: false };
  state.exit = { x: tileCenter(ex), y: tileCenter(ey), open: false };
  state.items = lv.items.map((it) => ({
    x: tileCenter(it.tile[0]), y: tileCenter(it.tile[1]), taken: false, name: it.name,
  }));
  state.lamps = lv.lamps.map(([tx, ty]) => ({ x: tileCenter(tx), y: tileCenter(ty), on: true }));
  state.guards = lv.guards.map((g) => {
    const wps = g.waypoints.map(([tx, ty]) => [tileCenter(tx), tileCenter(ty)]);
    const start = wps[0];
    const next = wps[1] || wps[0];
    return {
      x: start[0], y: start[1], dir: Math.atan2(next[1] - start[1], next[0] - start[0]),
      waypoints: wps, wpIndex: 1, pause: 0, state: 'patrol', meter: 0,
      range: g.range, fov: g.fov, speed: g.speed, lastSeen: null, loseTimer: 0,
    };
  });
  state.dogs = (lv.dogs || []).map((g) => {
    const wps = g.waypoints.map(([tx, ty]) => [tileCenter(tx), tileCenter(ty)]);
    const start = wps[0];
    const next = wps[1] || wps[0];
    return {
      x: start[0], y: start[1], dir: Math.atan2(next[1] - start[1], next[0] - start[0]),
      waypoints: wps, wpIndex: 1, pause: 0, state: 'patrol', meter: 0,
      range: g.range, fov: g.fov, speed: g.speed, lastSeen: null, loseTimer: 0,
    };
  });
  state.cameras = (lv.cameras || []).map((c) => ({
    x: tileCenter(c.tile[0]), y: tileCenter(c.tile[1]),
    dir: (c.sweep[0] + c.sweep[1]) / 2, sweep: c.sweep, speed: c.speed,
    range: c.range, fov: c.fov, meter: 0, phase: 0,
  }));
  state.searchlight = lv.searchlight
    ? { x: tileCenter(lv.searchlight.tile[0]), y: tileCenter(lv.searchlight.tile[1]), dir: 0, range: lv.searchlight.range, fov: lv.searchlight.fov, speed: lv.searchlight.speed, phase: 0 }
    : null;
  state.searchMeter = 0;
  state.coins = [];
  state.coinsLeft = 5;
  state.titleCard = false;
  state.timeLeft = lv.seconds;
  state.alert = 'calm';
  state.ghost = true;
  state.exit.open = false;
  updateHud();
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function updateHud() {
  const lv = state.level;
  $('level-name').textContent = `Level ${lv.id} — ${lv.name}`;
  $('level-sub').textContent = lv.subtitle;
  const got = state.items.filter((i) => i.taken).length;
  $('items').textContent = `Pusaka: ${got}/${state.items.length}`;
  $('lives').textContent = `Nyawa: ${'♥'.repeat(state.lives)}${'♡'.repeat(Math.max(0, 3 - state.lives))}`;
  $('score').textContent = `Skor: ${state.score}`;
  $('timer').textContent = fmtTime(state.timeLeft);
  $('timer').classList.toggle('low', state.timeLeft <= 30);
  const pill = $('alert-pill');
  pill.className = 'pill ' + (state.alert === 'alarm' ? 'alert-alarm' : state.alert === 'suspicious' ? 'alert-suspicious' : 'alert-calm');
  pill.textContent = state.alert === 'alarm' ? '● KETAHUAN!' : state.alert === 'suspicious' ? '● CURIGA…' : '● TENANG';
  $('message').textContent = state.message;
  $('mute-btn').textContent = isMuted() ? 'Suara: Mati (M)' : 'Suara: Hidup (M)';
  document.querySelectorAll('.level-tab').forEach((btn, i) => {
    btn.classList.toggle('active', i === state.levelIndex);
  });
  const remaining = state.items.length - got;
  $('objective').textContent = remaining > 0
    ? `Tujuan: curi ${remaining} pusaka lagi (${state.items.filter((i) => !i.taken).map((i) => i.name).join(', ')}), lalu kabur lewat pintu keluar hijau.`
    : 'Semua pusaka didapat! Kabur lewat pintu keluar hijau — jangan ketahuan di detik terakhir.';
}

function showOverlay(kicker, title, text, btn) {
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
  $('overlay-btn').textContent = btn;
  $('overlay').hidden = false;
}

function hideOverlay() {
  $('overlay').hidden = true;
}

function startLevel(index) {
  loadLevel(index);
  state.phase = 'play';
  state.frozen = false;
  state.message = 'Tetap di bayangan. Penjaga sedang berpatroli.';
  hideOverlay();
  updateHud();
}

function levelClear() {
  state.phase = 'levelClear';
  state.frozen = true;
  const timeBonus = Math.floor(state.timeLeft) * 2;
  const ghostBonus = state.ghost ? 200 : 0;
  state.score += timeBonus + ghostBonus;
  playWin();
  updateHud();
  if (state.levelIndex >= LEVELS.length - 1) {
    state.phase = 'win';
    showOverlay(
      'MISI SELESAI · PELABUHAN SENJA',
      'Semua Pusaka Dicuri!',
      `Raka menghilang ke dalam malam dengan skor ${state.score}. Bonus waktu +${timeBonus}${state.ghost ? ' · bonus hantu +200 (tak pernah ketahuan)' : ''}. Kamu menamatkan Shadows of Pasar Senja!`,
      'Main Lagi dari Level 1',
    );
    return;
  }
  const next = LEVELS[state.levelIndex + 1];
  showOverlay(
    `${state.level.name.toUpperCase()} · SELESAI`,
    'Level Selesai — Tak Terlihat!',
    `Semua pusaka didapat. Bonus waktu +${timeBonus}${state.ghost ? ' · bonus hantu +200' : ''}. Selanjutnya: ${next.name} — ${next.subtitle}.`,
    `Lanjut ke Level ${next.id}: ${next.name}`,
  );
}

function gameOver(reason) {
  state.phase = 'gameOver';
  state.frozen = true;
  showOverlay(
    'MISI GAGAL',
    reason === 'time' ? 'Waktu Habis!' : 'Tertangkap!',
    reason === 'time'
      ? `Fajar menyingsing sebelum pusaka terkumpul. Skor akhir ${state.score}. Coba lagi — bayangan adalah temanmu.`
      : `Penjaga akhirnya menangkap Raka. Skor akhir ${state.score}. Ingat: jongkok di bayangan, lempar koin untuk mengalihkan.`,
    'Coba Lagi dari Level 1',
  );
  updateHud();
}

function onCaught() {
  state.lives -= 1;
  state.ghost = false;
  playCaught();
  if (state.lives <= 0) {
    gameOver('caught');
    return;
  }
  state.phase = 'caught';
  state.caughtAt = performance.now();
  state.message = `Tertangkap! Nyawa tersisa ${state.lives}. Kembali ke titik awal…`;
  updateHud();
}

function respawn() {
  const [px, py] = findTile('P');
  state.player.x = tileCenter(px);
  state.player.y = tileCenter(py);
  state.player.dir = Math.PI / 2;
  for (const g of [...state.guards, ...state.dogs]) {
    const start = g.waypoints[0];
    g.x = start[0];
    g.y = start[1];
    g.state = 'patrol';
    g.meter = 0;
    g.wpIndex = 1;
    g.pause = 0;
    g.lastSeen = null;
    g.loseTimer = 0;
  }
  for (const c of state.cameras) c.meter = 0;
  state.searchMeter = 0;
  state.alert = 'calm';
  state.phase = 'play';
  state.message = 'Kamu lolos — untuk sekarang. Lebih hati-hati.';
  updateHud();
}

// --- Movement with wall collision (axis separated, radius 11) ---
function blockedAt(x, y) {
  const r = 11;
  const pts = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
  for (const [px, py] of pts) {
    if (tileAt(state.level, Math.floor(px / TILE), Math.floor(py / TILE)) === '#') return true;
  }
  return false;
}

function moveEntity(e, dx, dy) {
  if (!blockedAt(e.x + dx, e.y)) e.x += dx;
  if (!blockedAt(e.x, e.y + dy)) e.y += dy;
}

// --- Detection ---
function detectionRate(viewer, target) {
  const dist = Math.hypot(target.x - viewer.x, target.y - viewer.y);
  let rate = 55;
  if (dist < 70) rate = 110;
  else if (dist < 120) rate = 80;
  if (target.sneak) rate *= 0.45;
  if (inShadow(state.level, target.x, target.y)) rate *= 0.35;
  if (litByLamp(state.lamps, target.x, target.y)) rate *= 1.5;
  if (target.moving && !target.sneak) rate *= 1.2;
  return rate;
}

function updateWatcher(w, dt, isDog) {
  const p = state.player;
  const seen = canSee(state.level, w, p.x, p.y);
  if (w.state === 'patrol' || w.state === 'suspicious') {
    if (seen) {
      w.meter += detectionRate(w, p) * dt;
      if (w.meter > 25 && w.state === 'patrol') {
        w.state = 'suspicious';
        state.alert = 'suspicious';
        state.message = 'Seseorang curiga… sembunyi di bayangan!';
        playSuspicious();
      }
      if (w.meter >= 100) {
        w.state = 'chase';
        w.lastSeen = { x: p.x, y: p.y };
        w.loseTimer = 0;
        state.alert = 'alarm';
        state.message = 'KETAHUAN! Penjaga mengejarmu — lari ke bayangan!';
        playAlarm();
      }
    } else {
      w.meter = Math.max(0, w.meter - 30 * dt);
      if (w.meter <= 25 && w.state === 'suspicious') w.state = 'patrol';
    }
  }
  if (isDog) {
    const dist = Math.hypot(p.x - w.x, p.y - w.y);
    if (p.moving && !p.sneak && dist < 110 && w.state !== 'chase') {
      w.meter += 60 * dt;
      if (w.meter >= 100) {
        w.state = 'chase';
        w.lastSeen = { x: p.x, y: p.y };
        state.alert = 'alarm';
        state.message = 'Anjing mendengar langkahmu!';
        playAlarm();
      }
    }
  }
  // Coin distraction: investigators walk to the coin, then resume patrol.
  if (w.state === 'investigate' && w.lastSeen) {
    const d = Math.hypot(w.lastSeen.x - w.x, w.lastSeen.y - w.y);
    if (d < 12) {
      w.state = 'patrol';
      w.meter = Math.max(0, w.meter - 40);
    }
  }
}

function moveWatcher(w, dt) {
  if (w.state === 'chase' && w.lastSeen) {
    const p = state.player;
    const seen = canSee(state.level, w, p.x, p.y);
    if (seen) {
      w.lastSeen = { x: p.x, y: p.y };
      w.loseTimer = 0;
    } else {
      w.loseTimer += dt;
      if (w.loseTimer > 3) {
        w.state = 'investigate';
        w.meter = 60;
      }
    }
    const dx = w.lastSeen.x - w.x;
    const dy = w.lastSeen.y - w.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const sp = w.speed * 1.7 * dt;
      w.dir = Math.atan2(dy, dx);
      moveEntity(w, (dx / dist) * sp, (dy / dist) * sp);
    }
    if (Math.hypot(p.x - w.x, p.y - w.y) < 24) onCaught();
    return;
  }
  if (w.state === 'investigate' && w.lastSeen) {
    const dx = w.lastSeen.x - w.x;
    const dy = w.lastSeen.y - w.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const sp = w.speed * 1.1 * dt;
      w.dir = Math.atan2(dy, dx);
      moveEntity(w, (dx / dist) * sp, (dy / dist) * sp);
    }
    return;
  }
  // Patrol.
  if (w.pause > 0) {
    w.pause -= dt;
    return;
  }
  const target = w.waypoints[w.wpIndex];
  const dx = target[0] - w.x;
  const dy = target[1] - w.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    w.wpIndex = (w.wpIndex + 1) % w.waypoints.length;
    w.pause = 0.8;
    return;
  }
  const sp = w.speed * dt;
  w.dir = Math.atan2(dy, dx);
  moveEntity(w, (dx / dist) * sp, (dy / dist) * sp);
}

function update(dt) {
  if (state.phase === 'caught' && performance.now() - state.caughtAt > 1200) {
    respawn();
    return;
  }
  if (state.phase !== 'play') return;

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    updateHud();
    gameOver('time');
    return;
  }

  // Player movement.
  const mv = input.moveVector();
  const speed = mv.sneak ? 78 : 148;
  const p = state.player;
  p.sneak = mv.sneak;
  p.moving = mv.x !== 0 || mv.y !== 0;
  if (p.moving) {
    p.dir = Math.atan2(mv.y, mv.x);
    moveEntity(p, mv.x * speed * dt, mv.y * speed * dt);
    if (performance.now() - state.stepAt > (mv.sneak ? 520 : 340)) {
      state.stepAt = performance.now();
      if (!mv.sneak) playStep();
    }
  }

  // Coins fade.
  for (const coin of state.coins) coin.ttl -= dt;
  state.coins = state.coins.filter((c) => c.ttl > 0);

  // Guards and dogs.
  for (const g of state.guards) {
    updateWatcher(g, dt, false);
    moveWatcher(g, dt);
    if (state.phase !== 'play') return;
  }
  for (const d of state.dogs) {
    updateWatcher(d, dt, true);
    moveWatcher(d, dt);
    if (state.phase !== 'play') return;
  }

  // Cameras rotate and watch; a full camera meter sends the nearest guard.
  for (const cam of state.cameras) {
    cam.phase += dt * cam.speed;
    const mid = (cam.sweep[0] + cam.sweep[1]) / 2;
    const amp = (cam.sweep[1] - cam.sweep[0]) / 2;
    cam.dir = mid + Math.sin(cam.phase) * amp;
    const seen = canSee(state.level, cam, p.x, p.y);
    if (seen) {
      let rate = 70;
      if (p.sneak) rate *= 0.45;
      if (inShadow(state.level, p.x, p.y)) rate *= 0.35;
      cam.meter += rate * dt;
      if (cam.meter >= 100) {
        cam.meter = 40;
        state.alert = 'alarm';
        state.message = 'Kamera melihatmu! Penjaga dikerahkan!';
        playAlarm();
        let best = null;
        let bestD = Infinity;
        for (const g of state.guards) {
          const d = Math.hypot(g.x - p.x, g.y - p.y);
          if (d < bestD) { bestD = d; best = g; }
        }
        if (best) {
          best.state = 'chase';
          best.lastSeen = { x: p.x, y: p.y };
          best.meter = 100;
        }
      }
    } else {
      cam.meter = Math.max(0, cam.meter - 35 * dt);
    }
  }

  // Searchlight (level 3).
  if (state.searchlight) {
    const sl = state.searchlight;
    sl.phase += dt * sl.speed;
    sl.dir = Math.sin(sl.phase) * 1.2;
    if (canSee(state.level, sl, p.x, p.y) && !inShadow(state.level, p.x, p.y)) {
      state.searchMeter += 55 * dt;
      if (state.searchMeter >= 100) {
        state.searchMeter = 40;
        state.alert = 'alarm';
        state.message = 'Lampu sorot menemukanmu!';
        playAlarm();
        const g = state.guards[0];
        if (g && g.state !== 'chase') {
          g.state = 'chase';
          g.lastSeen = { x: p.x, y: p.y };
          g.meter = 100;
        }
      }
    } else {
      state.searchMeter = Math.max(0, state.searchMeter - 30 * dt);
    }
  }

  // Global alert state settles when nobody is alarmed.
  const anyAlarm = [...state.guards, ...state.dogs].some((w) => w.state === 'chase')
    || state.cameras.some((c) => c.meter > 60);
  const anySuspicious = [...state.guards, ...state.dogs].some((w) => w.state === 'suspicious' || w.state === 'investigate');
  if (!anyAlarm && !anySuspicious && state.alert !== 'calm') {
    state.alert = 'calm';
    state.message = 'Aman lagi. Lanjutkan menyusup.';
  } else if (!anyAlarm && anySuspicious) {
    state.alert = 'suspicious';
  }

  // Exit opens when all items are taken.
  const got = state.items.filter((i) => i.taken).length;
  if (got === state.items.length && !state.exit.open) {
    state.exit.open = true;
    state.message = 'Semua pusaka didapat! Kabur lewat pintu keluar hijau!';
  }
  updateHud();
}

function onInteract() {
  if (state.frozen || state.phase !== 'play') return;
  const p = state.player;
  for (const item of state.items) {
    if (!item.taken && Math.hypot(item.x - p.x, item.y - p.y) < 34) {
      item.taken = true;
      state.score += 150;
      state.message = `Dapat ${item.name}! (+150)`;
      playPickup();
      updateHud();
      return;
    }
  }
  for (const lamp of state.lamps) {
    if (lamp.on && Math.hypot(lamp.x - p.x, lamp.y - p.y) < 44) {
      lamp.on = false;
      state.score += 25;
      state.message = 'Lampu dimatikan. Area ini sekarang gelap — bagus untuk menyusup. (+25)';
      playCoin();
      updateHud();
      return;
    }
  }
  if (state.exit.open && Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 34) {
    levelClear();
  }
}

function onThrowCoin() {
  if (state.frozen || state.phase !== 'play') return;
  if (state.coinsLeft <= 0) {
    state.message = 'Koin habis! Sisa 0 — andalkan bayangan.';
    updateHud();
    return;
  }
  state.coinsLeft -= 1;
  const p = state.player;
  const cx = p.x + Math.cos(p.dir) * 95;
  const cy = p.y + Math.sin(p.dir) * 95;
  state.coins.push({ x: cx, y: cy, ttl: 2.2 });
  playCoin();
  state.message = `Koin dilempar! (${state.coinsLeft} tersisa) Penjaga di dekatnya akan memeriksa.`;
  for (const w of [...state.guards, ...state.dogs]) {
    if (w.state === 'chase') continue;
    if (Math.hypot(w.x - cx, w.y - cy) < 180) {
      w.state = 'investigate';
      w.lastSeen = { x: cx, y: cy };
      w.meter = Math.max(w.meter, 30);
    }
  }
  updateHud();
}

function onConfirm() {
  if (state.phase === 'menu') {
    startLevel(state.levelIndex);
  } else if (state.phase === 'levelClear') {
    if (state.levelIndex < LEVELS.length - 1) startLevel(state.levelIndex + 1);
    else startLevel(0);
  } else if (state.phase === 'gameOver' || state.phase === 'win') {
    startLevel(0);
  }
}

const input = bindInput({
  onInteract,
  onThrowCoin,
  onRestart: () => {
    if (state.frozen) return;
    startLevel(state.levelIndex);
  },
  onMute: () => {
    setMuted(!isMuted());
    updateHud();
  },
  onConfirm,
  onLevel: (i) => {
    if (state.frozen) return;
    startLevel(i);
  },
});

$('start-btn').addEventListener('click', () => {
  if (state.phase === 'menu') startLevel(state.levelIndex);
  else if (state.phase === 'levelClear' || state.phase === 'gameOver' || state.phase === 'win') onConfirm();
});
$('restart-btn').addEventListener('click', () => {
  if (!state.frozen) startLevel(state.levelIndex);
});
$('mute-btn').addEventListener('click', () => {
  setMuted(!isMuted());
  updateHud();
});
$('overlay-btn').addEventListener('click', onConfirm);
document.querySelectorAll('.level-tab').forEach((btn, i) => {
  btn.addEventListener('click', () => {
    if (!state.frozen) startLevel(i);
  });
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.frozen) state.now = now;
  if (!state.frozen) update(dt);
  drawScene(ctx, { ...state, now: state.now });
  requestAnimationFrame(frame);
}

function boot() {
  // Small read-only debug handle used by automated play-tests.
  window.__stealth = { state };
  const { shot } = parseShot();
  if (shot) {
    stageShot({ state, loadLevel }, shot);
    if (state.phase === 'menu' && !state.titleCard) {
      showOverlay(
        LEVELS[0].kicker,
        'Shadows of Pasar Senja',
        'Malam turun di pasar. Tiga pusaka menunggu — dan penjaga tidak pernah tidur. Selinap dalam bayangan, curi semuanya, kabur tanpa ketahuan.',
        'Mulai Menyusup',
      );
    }
  } else {
    loadLevel(0);
    state.phase = 'menu';
    state.frozen = true;
    showOverlay(
      LEVELS[0].kicker,
      'Shadows of Pasar Senja',
      'Malam turun di pasar. Tiga pusaka menunggu — dan penjaga tidak pernah tidur. Selinap dalam bayangan, curi semuanya, kabur tanpa ketahuan.',
      'Mulai Menyusup',
    );
  }
  updateHud();
  requestAnimationFrame(frame);
}

boot();
