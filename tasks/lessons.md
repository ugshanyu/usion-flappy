# Lessons

- When native DOM pointer input drives a PixiJS game, disable Pixi's federated event features and scene hit testing. Otherwise every tap is processed twice and can cause a one-frame rendering hitch that looks like world objects have shifted.
- Smooth frame delivery is not enough if the movement model itself feels wrong. Before tuning rendering, match the reference game's motion ratios: constant world speed, flap arc, visual scale, gradual rotation, consistent pipe cadence, and a falling death sequence.
- Pointer handlers must not mutate or redraw the world. Queue gameplay input, consume it in the fixed-step loop, keep the background in its static CSS layer, and let obstacle transforms advance only on scheduled frames.
