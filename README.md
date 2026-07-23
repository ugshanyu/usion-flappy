Flappy — Usion mini-game

Single-player Flappy Bird for the Usion platform. Tap to flap; score is pipes passed.
On game over the score submits to the platform leaderboard (Usion.leaderboard.submit)
and the panel shows your accepted friends' records (Usion.leaderboard.friends).

Static single file (index.html), SDK loaded from https://usions.com/usion-sdk.js.
Deployed on Vercel; registered in the Usion service registry with leaderboard enabled
(backend/scripts/seed_flappy_bird.py in the main monorepo).

Game artwork lives in `icons/`. The 1024px source is used for service and social
previews; optimized 32px, 180px, 192px, and 512px variants cover browser, Apple
touch, and installable web-app surfaces through `index.html` and
`manifest.webmanifest`.

The in-game artwork mirrors the service icon: a golden three-pose bird, glossy
green pipe walls, cyan highlights, and a starry deep-blue horizon scene. The
scene and sprites are rendered into small cached canvases once and reused.

Performance is adaptive: physics runs at a fixed 60 Hz, while low-core,
low-memory, reduced-motion, or persistently slow devices switch to a 30 FPS
render budget and 1x canvas resolution. Long browser stalls are discarded
instead of fast-forwarding the player into a collision.
