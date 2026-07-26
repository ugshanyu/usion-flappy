Flappy — Usion mini-game

Single-player Flappy Bird for the Usion platform. Tap to flap; score is pipes passed.
On game over the score submits to the platform leaderboard (Usion.leaderboard.submit)
and the panel shows your accepted friends' records (Usion.leaderboard.friends).

Static client (`index.html`, focused `game-*.js` modules, and `game-assets/`), SDK loaded from
https://usions.com/usion-sdk.js. Deployed on Vercel; registered in the Usion
service registry with leaderboard enabled (`backend/scripts/seed_flappy_bird.py`
in the main monorepo).

Game artwork lives in `icons/`. The 1024px source is used for service and social
previews; optimized 32px, 180px, 192px, and 512px variants cover browser, Apple
touch, and installable web-app surfaces through `index.html` and
`manifest.webmanifest`.

Generated gameplay artwork lives in `game-assets/`: three normalized bird poses,
a reusable pipe cap/body, and an optimized background. All were generated with
the service icon as the visual reference, then chroma-keyed and prepared as
production PNG/WebP assets.

The renderer deliberately stays simple on every device: one PixiJS WebGL canvas
at 1x resolution over the generated CSS background. PixiJS 8.19.0 is pinned
locally in `vendor/pixi/8.19.0`, so gameplay does not depend on a third-party
CDN. The scene uses one ticker, one bird sprite, pooled pipe containers, and no
physics plugin or Pixi pointer hit-testing.

The gameplay model in `game-engine.js` is a direct JavaScript port of the
MIT-licensed FlapPyBird legacy implementation at commit
`038359dc6122f8d851e816ddb3e7d28229d585e5`. It preserves that implementation's
fixed 288×512 world, 30 FPS update order, 100px pipe gap, flap/fall velocities,
rotation thresholds, fixed pipe cadence, four-pixel scoring window, welcome
bob, collision transition, and crash fall. See `THIRD_PARTY_NOTICES.md`.

Pointer input is isolated from rendering: a tap only queues a flap flag, which
the next reference tick consumes. PixiJS interpolates the unchanged 30 FPS
mechanics at the device display rate. The CSS background stays static, pipe
geometry remains pooled, and taps never trigger an extra render.

Only the visual assets differ from the reference game: the bird poses, pipe
cap/body, background, icon, and social previews are the custom generated assets
already stored in this repository. Original Flappy Bird/FlapPyBird artwork is
not included.
