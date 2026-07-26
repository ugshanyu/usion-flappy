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

The original-style motion model lives in `game-engine.js`. Physics runs at a
fixed 120 Hz and rendering interpolates on every display refresh, so movement
keeps the same timing on 60/90/120/144 Hz screens. Flap strength, gravity,
sprite size, pipe speed, and spacing scale from viewport width; pipe speed stays
constant as score rises. The bird rotates gradually and visibly falls after a
collision before the score panel appears. Long browser stalls are discarded
instead of fast-forwarding into a collision.
