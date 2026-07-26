# Lessons

- When native DOM pointer input drives a PixiJS game, disable Pixi's federated event features and scene hit testing. Otherwise every tap is processed twice and can cause a one-frame rendering hitch that looks like world objects have shifted.
