# Third-party notices

## FlapPyBird mechanics

The gameplay state machine and numeric mechanics in `game-engine.js` are a
JavaScript port of the legacy one-file implementation from
[sourabhv/FlapPyBird](https://github.com/sourabhv/FlapPyBird), commit
`038359dc6122f8d851e816ddb3e7d28229d585e5`.

FlapPyBird is provided under the MIT License. A copy of the repository's
license is included at `licenses/FlapPyBird-MIT.txt`.

The port changes the runtime and rendering integration from Python/Pygame to
JavaScript/PixiJS and connects scoring to Usion. The 288×512 world, 30 FPS
simulation, input order, velocity, acceleration, rotation, pipe generation,
gap, movement, scoring window, welcome animation, collision transition, and
crash fall follow the referenced implementation.

No FlapPyBird or original Flappy Bird artwork is distributed by this project.
All visible bird, pipe, background, and icon files are the custom generated
assets already stored in this repository.
