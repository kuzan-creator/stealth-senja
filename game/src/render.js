// Shadows of Pasar Senja — all canvas drawing: the night map, vision cones,
// guards, cameras, the player, lamps, the minimap and the HUD-in-canvas bits.
// Vision math lives here too so the game logic and the picture agree.
import { TILE, COLS, ROWS } from './levels.js';

const THEMES = [
  { floorA: '#2a2f4d', floorB: '#252a44', wall: '#4a382a', wallTop: '#8a6238', shadow: '#16294d', accent: '#f5b942' },
  { floorA: '#2c3149', floorB: '#272c42', wall: '#565664', wallTop: '#9a9aac', shadow: '#14264a', accent: '#b388ff' },
  { floorA: '#2a2e38', floorB: '#252932', wall: '#445064', wallTop: '#7488a0', shadow: '#122c44', accent: '#4dd0e1' },
];

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}

export function isWall(level, tx, ty) {
  return tileAt(level, tx, ty) === '#';
}

function wallBlocks(level, px, py) {
  return isWall(level, Math.floor(px / TILE), Math.floor(py / TILE));
}

// Line of sight: sample the segment; a wall tile anywhere blocks it.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (wallBlocks(level, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the target is inside the viewer's cone and line of sight.
export function canSee(level, viewer, tx, ty) {
  const dx = tx - viewer.x;
  const dy = ty - viewer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > viewer.range) return false;
  if (dist < 26) return hasLineOfSight(level, viewer.x, viewer.y, tx, ty);
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, viewer.dir)) > viewer.fov) return false;
  return hasLineOfSight(level, viewer.x, viewer.y, tx, ty);
}

export function inShadow(level, px, py) {
  return tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE)) === ',';
}

export function litByLamp(lamps, px, py) {
  for (const lamp of lamps) {
    if (!lamp.on) continue;
    if (Math.hypot(px - lamp.x, py - lamp.y) < 95) return true;
  }
  return false;
}

function drawCone(ctx, x, y, dir, range, fov, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - fov, dir + fov);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawMeter(ctx, x, y, meter) {
  const w = 34;
  const h = 6;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = meter > 66 ? '#ff5346' : meter > 25 ? '#ffd75e' : '#8be28b';
  ctx.fillRect(x - w / 2, y, (w * Math.min(100, meter)) / 100, h);
}

export function drawScene(ctx, s) {
  const level = s.level;
  const theme = THEMES[s.levelIndex % THEMES.length];
  const W = COLS * TILE;
  const H = ROWS * TILE;

  // Floor.
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = level.map[ty][tx];
      const px = tx * TILE;
      const py = ty * TILE;
      if (ch === '#') continue;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? theme.floorA : theme.floorB;
      ctx.fillRect(px, py, TILE, TILE);
      if (ch === ',') {
        ctx.fillStyle = theme.shadow;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(120,160,255,0.16)';
        ctx.beginPath();
        ctx.arc(px + 12, py + 12, 3, 0, Math.PI * 2);
        ctx.arc(px + 28, py + 26, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Lamp glow (under everything else that walks).
  for (const lamp of s.lamps) {
    if (!lamp.on) continue;
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 95);
    g.addColorStop(0, 'rgba(255,215,94,0.20)');
    g.addColorStop(1, 'rgba(255,215,94,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 95, 0, Math.PI * 2);
    ctx.fill();
  }

  // Exit gate.
  ctx.fillStyle = s.exit.open ? '#2e7d32' : '#37474f';
  ctx.fillRect(s.exit.x - 18, s.exit.y - 18, 36, 36);
  ctx.strokeStyle = s.exit.open ? '#69f0ae' : '#78909c';
  ctx.lineWidth = 3;
  ctx.strokeRect(s.exit.x - 18, s.exit.y - 18, 36, 36);
  ctx.fillStyle = s.exit.open ? '#b9f6ca' : '#b0bec5';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.exit.open ? 'KELUAR' : 'TUTUP', s.exit.x, s.exit.y + 4);
  if (s.exit.open) {
    ctx.strokeStyle = `rgba(105,240,174,${0.5 + 0.4 * Math.sin(s.now / 300)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(s.exit.x - 24, s.exit.y - 24, 48, 48);
  }

  // Items (pusaka): gold diamonds that bob and sparkle.
  for (const item of s.items) {
    if (item.taken) continue;
    const bob = Math.sin(s.now / 400 + item.x) * 3;
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, item.x, item.y + 26);
  }

  // Lamps (posts).
  for (const lamp of s.lamps) {
    ctx.fillStyle = lamp.on ? '#ffe082' : '#546e7a';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1230';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Walls on top of the floor, with a lit top edge.
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (level.map[ty][tx] !== '#') continue;
      const px = tx * TILE;
      const py = ty * TILE;
      ctx.fillStyle = theme.wall;
      ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = theme.wallTop;
      ctx.fillRect(px + 1, py + 1, TILE - 2, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(px + 1, py + TILE - 6, TILE - 2, 5);
    }
  }

  // Patrol paths (faint dotted lines, so the player can plan).
  ctx.setLineDash([2, 7]);
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 2;
  for (const guard of s.guards) {
    ctx.beginPath();
    guard.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w[0], w[1]);
      else ctx.lineTo(w[0], w[1]);
    });
    ctx.closePath();
    ctx.stroke();
  }
  for (const dog of s.dogs) {
    ctx.beginPath();
    dog.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w[0], w[1]);
      else ctx.lineTo(w[0], w[1]);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Searchlight (level 3): a wide sweeping beam from the tower.
  if (s.searchlight) {
    drawCone(ctx, s.searchlight.x, s.searchlight.y, s.searchlight.dir, s.searchlight.range, s.searchlight.fov, 'rgba(255,244,180,0.16)');
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.arc(s.searchlight.x, s.searchlight.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#37474f';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOROT', s.searchlight.x, s.searchlight.y - 14);
  }

  // Cameras: rotating cones.
  for (const cam of s.cameras) {
    drawCone(ctx, cam.x, cam.y, cam.dir, cam.range, cam.fov, cam.meter > 25 ? 'rgba(255,83,70,0.38)' : 'rgba(179,136,255,0.34)');
    ctx.fillStyle = '#7e57c2';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e1bee7';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawMeter(ctx, cam.x, cam.y - 20, cam.meter);
  }

  // Guards: vision cone, body, facing tick, detection meter.
  for (const guard of s.guards) {
    const chasing = guard.state === 'chase';
    const suspicious = guard.state === 'suspicious' || guard.state === 'investigate';
    drawCone(
      ctx, guard.x, guard.y, guard.dir, guard.range, guard.fov,
      chasing ? 'rgba(255,60,40,0.42)' : suspicious ? 'rgba(255,180,60,0.38)' : 'rgba(255,215,94,0.28)',
    );
    ctx.fillStyle = chasing ? '#ff1744' : '#e53935';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffebee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.dir) * 20, guard.y + Math.sin(guard.dir) * 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(chasing ? '!' : suspicious ? '?' : '', guard.x, guard.y - 20);
    drawMeter(ctx, guard.x, guard.y - 30, guard.meter);
  }

  // Dogs: fast, short cone, hear footsteps.
  for (const dog of s.dogs) {
    drawCone(ctx, dog.x, dog.y, dog.dir, dog.range, dog.fov, dog.state === 'chase' ? 'rgba(255,60,40,0.38)' : 'rgba(255,170,80,0.30)');
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.arc(dog.x, dog.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Ears.
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(dog.x - 5, dog.y - 8, 3, 0, Math.PI * 2);
    ctx.arc(dog.x + 5, dog.y - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    drawMeter(ctx, dog.x, dog.y - 26, dog.meter);
  }

  // Thrown coins: gold dot + expanding ring.
  for (const coin of s.coins) {
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,94,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6 + (1 - coin.ttl / 2.2) * 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Player: cyan, smaller + dashed crouch ring while sneaking.
  const p = s.player;
  if (p.sneak) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(77,208,225,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (p.moving && !p.sneak) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#4dd0e1';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.sneak ? 10 : 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e0f7fa';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.dir) * 18, p.y + Math.sin(p.dir) * 18);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (inShadow(level, p.x, p.y)) {
    ctx.fillStyle = '#9db8ff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TERSEMBUNYI', p.x, p.y - 20);
  }

  // Night vignette: dark corners, but the play area stays readable.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(5,6,16,0)');
  vg.addColorStop(1, 'rgba(5,6,16,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  drawMinimap(ctx, s, W - 168, 10);

  // Title card (cover screenshot): big readable title over the live scene.
  if (s.titleCard) {
    ctx.fillStyle = 'rgba(5,6,16,0.72)';
    ctx.fillRect(0, 0, W, 108);
    ctx.fillStyle = '#f5b942';
    ctx.fillRect(0, 108, W, 4);
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOWS OF PASAR SENJA', W / 2, 52);
    ctx.fillStyle = '#f2e8d5';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText('STEALTH HEIST  ·  PASAR MALAM  ·  MUSEUM PUSAKA  ·  PELABUHAN', W / 2, 86);
  }
}

function drawMinimap(ctx, s, mx, my) {
  const mw = 158;
  const mh = 98;
  const sx = mw / (COLS * TILE);
  const sy = mh / (ROWS * TILE);
  ctx.fillStyle = 'rgba(5,6,16,0.78)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.strokeStyle = '#f5b942';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      if (s.level.map[ty][tx] === '#') {
        ctx.fillStyle = '#5a5f7a';
        ctx.fillRect(mx + tx * TILE * sx, my + ty * TILE * sy, TILE * sx + 0.5, TILE * sy + 0.5);
      }
    }
  }
  ctx.fillStyle = '#69f0ae';
  ctx.fillRect(mx + s.exit.x * sx - 3, my + s.exit.y * sy - 3, 6, 6);
  for (const item of s.items) {
    if (item.taken) continue;
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(mx + item.x * sx, my + item.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const guard of s.guards) {
    ctx.fillStyle = '#ff5346';
    ctx.beginPath();
    ctx.arc(mx + guard.x * sx, my + guard.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#4dd0e1';
  ctx.beginPath();
  ctx.arc(mx + s.player.x * sx, my + s.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e0f7fa';
  ctx.lineWidth = 1;
  ctx.stroke();
}
