Flappy — Usion mini-game

Single-player Flappy Bird for the Usion platform. Tap to flap; score is pipes passed.
On game over the score submits to the platform leaderboard (Usion.leaderboard.submit)
and the panel shows your accepted friends' records (Usion.leaderboard.friends).

Static single file (index.html), SDK loaded from https://usions.com/usion-sdk.js.
Deployed on Vercel; registered in the Usion service registry with leaderboard enabled
(backend/scripts/seed_flappy_bird.py in the main monorepo).
