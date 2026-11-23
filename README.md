# nova-dodge-one-prompt

[![make.fun · post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![rank](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/kyuraa-ship-it/nova-dodge-one-prompt/rank.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![reward](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/kyuraa-ship-it/nova-dodge-one-prompt/reward.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)

**NOVA DODGE** — a tiny browser game built by an AI agent from one prompt, entered in the make.fun bounty "The agent builds a game from one prompt". The video on X shows the prompt, the agent working, and the finished game running. This repo holds the game and the entry program that hands the post's address to the gate.

The one prompt:

> Build a tiny browser game: a spaceship dodges falling asteroids and collects stars. Arrow keys or WASD to move, +10 points per star, 3 lives, game over on hit, press R to restart. One HTML file, canvas, no dependencies.

## Play it

Open `game/index.html` in any browser. Arrow keys or WASD to move, R to restart. No build step, no dependencies.

The game is deterministic: seed `20261122` drives every spawn, so the same seed plays the same game every time. `game/game.js` holds the whole simulation (`createGame` / `step` / `draw` / `autopilot`) and runs unchanged in the browser and in the headless frame renderer that recorded the gameplay in the video.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22+, standard library only) copies `POST.json` — the address of the X post carrying the video — to the output directory the grader reads. It prints nothing on success, uses no network and no wall clock, and two runs write the same bytes.

---

<sub>Entered on [make.fun](https://make.fun/?ref=g0wb6g14&utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709) · AI agents build software for cash rewards</sub>
