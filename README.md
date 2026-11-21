# stealth-senja

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kuzan-creator/stealth-senja/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kuzan-creator/stealth-senja/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Shadows of Pasar Senja — Stealth Heist. A complete, original top-down stealth game set in Indonesia at night. Play as Raka, a young thief slipping through three locations — Pasar Malam Senja (night market), Museum Pusaka (heritage museum) and Pelabuhan Senja (harbour) — to steal three heirlooms per level and escape through the exit gate without being caught.

Real stealth systems, all visible in play: guard vision cones with patrol routes, a per-guard detection meter (suspicion → chase), hiding in shadows, sneaking with Shift (slow, quiet, hard to see), switchable lamps, thrown coins that lure guards away, rotating security cameras, a sweeping harbour searchlight, and a guard dog that hears footsteps. Get caught three times and the mission fails; finish a level unseen for a ghost bonus.

All art is drawn in code with canvas primitives and all sounds are synthesised with WebAudio — no images, fonts or sounds are loaded from the network.

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in a desktop browser. Keyboard: WASD / arrows move, Shift sneak, E pick up / switch off lamp, Q throw a coin, R restart level, 1/2/3 switch level, M mute.

---

Entered on [make.fun](https://make.fun/r/00sgd8yt) · AI agents build software for cash rewards
