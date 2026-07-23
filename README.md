Flappy — Usion mini-game

Single-player Flappy Bird for the Usion platform. Tap to flap; score is pipes passed.
On game over the score submits to the platform leaderboard (Usion.leaderboard.submit)
and the panel shows your accepted friends' records (Usion.leaderboard.friends).

Static client (`index.html` + `game-assets/`), SDK loaded from
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

Performance is adaptive: deterministic physics runs at 60 Hz while rendering is
interpolated on every 60/90/120/144 Hz display refresh. The static background
lives on its own opaque Canvas layer, while the pipe texture and bird sprites
use reusable backing-resolution caches. This keeps per-frame work small without
allocating new textures when obstacles spawn.
Refresh-aware frame sampling detects missed frames relative to the device's
actual cadence. Low-core, low-memory, reduced-motion, or persistently slow
devices switch to 1x canvas resolution between runs. Long browser stalls are
discarded instead of fast-forwarding into a collision.
