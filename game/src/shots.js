// Screenshot staging behind ?shot=...&seed=... (see shots.json).
// Each shot stages the real game into a fixed, deterministic state, so a
// screenshot is a frame of real play, never a mock-up:
//   start   — title menu over Level 1, guards on patrol, cones visible
//   play    — Level 1 mid-heist: 1 pusaka taken, guard suspicious, player
//             hidden in shadow, a thrown coin mid-ring
//   museum  — Level 2 mid-heist: 2 pusaka taken, camera cone sweeping the
//             player, guard suspicious
//   alarm   — Level 3 alarm: guard chasing the player, dog suspicious,
//             searchlight sweeping, 2 pusaka taken
// Any other value (or none) starts a normal fresh game at the title menu.
export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot') || '',
    seed: Number(params.get('seed') || '1'),
  };
}

export function stageShot(api, shot) {
  const S = api.state;
  if (shot === 'play') {
    api.loadLevel(0);
    S.phase = 'play';
    S.frozen = true;
    S.now = 1200;
    S.items[0].taken = true;
    S.score = 320;
    S.timeLeft = 132;
    S.coinsLeft = 4;
    S.player.x = 5 * 40 + 20;
    S.player.y = 3 * 40 + 20;
    S.player.dir = Math.PI / 2;
    S.player.sneak = true;
    S.guards[0].x = 8 * 40 + 20;
    S.guards[0].y = 2 * 40 + 20;
    S.guards[0].dir = Math.PI;
    S.guards[0].state = 'suspicious';
    S.guards[0].meter = 55;
    S.coins = [{ x: 10 * 40 + 20, y: 5 * 40 + 20, ttl: 1.4 }];
    S.message = 'Penjaga curiga — ada yang bergerak di kios. Tetap di bayangan!';
    return;
  }
  if (shot === 'museum') {
    api.loadLevel(1);
    S.phase = 'play';
    S.frozen = true;
    S.now = 1200;
    S.items[0].taken = true;
    S.items[1].taken = true;
    S.score = 780;
    S.timeLeft = 164;
    S.coinsLeft = 3;
    S.player.x = 9 * 40 + 20;
    S.player.y = 6 * 40 + 20;
    S.player.dir = 0;
    S.player.sneak = true;
    S.cameras[0].dir = 0.6;
    S.cameras[0].meter = 42;
    S.guards[0].x = 12 * 40 + 20;
    S.guards[0].y = 6 * 40 + 20;
    S.guards[0].dir = Math.PI;
    S.guards[0].state = 'suspicious';
    S.guards[0].meter = 48;
    S.message = 'Kamera hampir melihatmu — tunggu lensanya berpaling.';
    return;
  }
  if (shot === 'alarm') {
    api.loadLevel(2);
    S.phase = 'play';
    S.frozen = true;
    S.now = 1200;
    S.items[0].taken = true;
    S.items[1].taken = true;
    S.score = 1240;
    S.timeLeft = 96;
    S.lives = 2;
    S.coinsLeft = 2;
    S.player.x = 12 * 40 + 20;
    S.player.y = 9 * 40 + 20;
    S.player.dir = -Math.PI / 2;
    S.player.sneak = false;
    S.guards[0].x = 12 * 40 + 20;
    S.guards[0].y = 6 * 40 + 20;
    S.guards[0].dir = Math.PI / 2;
    S.guards[0].state = 'chase';
    S.guards[0].meter = 100;
    S.dogs[0].x = 9 * 40 + 20;
    S.dogs[0].y = 4 * 40 + 20;
    S.dogs[0].dir = Math.PI / 2;
    S.dogs[0].state = 'suspicious';
    S.dogs[0].meter = 70;
    S.searchlight.dir = 1.1;
    S.alert = 'alarm';
    S.message = 'KETAHUAN! Lari ke bayangan — penjaga mengejarmu!';
    return;
  }
  // start (and default): title card over fresh Level 1 — the cover shot.
  api.loadLevel(0);
  S.phase = 'menu';
  S.frozen = true;
  S.now = 1200;
  S.titleCard = true;
}
