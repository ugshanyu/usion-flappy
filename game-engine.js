(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlappyEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var STATES = { READY: 'ready', PLAYING: 'playing', DYING: 'dying', DEAD: 'dead' };
  var BASE_WIDTH = 390;
  var EMPTY_EVENTS = [];
  var WING_CYCLE = [0, 1, 2, 1];
  var BIRD_MASK_WIDTH = 52;
  var BIRD_MASK_HEIGHT = 46;
  // Alpha >= 48, sampled from bird-up, bird-mid, and bird-down at draw size.
  var BIRD_MASK_ROWS = [
    [
      '00000000:00000', '00000000:00000', '00000000:00000', '1f000000:00000',
      '7f000000:00000', 'fff00000:00000', 'fff07800:00000', 'fff07800:00001',
      'ffe0fc00:00001', 'fff8ff00:00003', 'fffdff80:0000f', 'fff1ff80:0003f',
      'fffbff80:0007f', 'ffffff80:000ff', 'ffffff80:001ff', 'ffffff80:003ff',
      'ffffffc0:007ff', 'ffffffc0:007ff', 'ffffffc0:007ff', 'ffffff80:00fff',
      'ffffff00:00fff', 'fffffe00:00fff', 'ffffff00:07fff', 'ffffff00:0ffff',
      'fffffe00:0ffff', 'fffffc00:03fff', 'fffff800:01fff', 'fffffc00:01fff',
      'fffff800:03fff', 'ffffffe0:03fff', 'ffffffe0:01fff', 'fffffff0:007ff',
      'fffffff8:003ff', 'fffffff0:001ff', 'ffffffe0:001ff', 'ffffffe0:000ff',
      'ffff3ff0:0003f', 'fffe1ff0:0001f', 'fff80600:00007', '7fc00000:00000',
      '00000000:00000', '00000000:00000', '00000000:00000', '00000000:00000',
      '00000000:00000', '00000000:00000'
    ],
    [
      '00000000:00000', '00000000:00000', '00000000:00000', '1f000000:00000',
      '7e000000:00000', 'ffe00000:00000', 'fff00000:00000', 'fff00000:00001',
      'ffc00000:00001', 'fff80000:00003', 'fff80000:0000f', 'fff00000:0003f',
      'fff80000:0007f', 'fffc0000:000ff', 'fffe0000:001ff', 'ffff0000:003ff',
      'ffff8000:007ff', 'ffff8000:007ff', 'ffffc000:00fff', 'ffffff80:00fff',
      'ffffffe0:00fff', 'ffffffe0:00fff', 'ffffffe0:07fff', 'ffffffc0:0ffff',
      'ffffff80:0ffff', 'ffffff80:03fff', 'ffffffc0:01fff', 'ffffffc0:01fff',
      'ffffff80:03fff', 'ffffffe0:03fff', 'ffffffe0:01fff', 'fffffff0:007ff',
      'fffffff0:003ff', 'fffffff0:003ff', 'ffffffe0:001ff', 'ffffffc0:000ff',
      'ffff3fe0:0003f', 'fffc1fe0:0001f', 'fff80c00:00007', 'ffc00000:00000',
      '00000000:00000', '00000000:00000', '00000000:00000', '00000000:00000',
      '00000000:00000', '00000000:00000'
    ],
    [
      '00000000:00000', '00000000:00000', '06000000:00000', '1f000000:00000',
      '7e000000:00000', 'fff00000:00000', 'fff00000:00001', 'ffe00000:00001',
      'ffc00000:00003', 'fff80000:00003', 'fff80000:0000f', 'fff00000:0003f',
      'fff80000:0007f', 'fffc0000:001ff', 'fffe0000:001ff', 'ffff0000:003ff',
      'ffff8000:007ff', 'ffff8000:007ff', 'ffffc000:00fff', 'ffffc000:00fff',
      'ffffe000:00fff', 'ffffe000:00fff', 'ffffe000:07fff', 'fffff000:0ffff',
      'fffff000:07fff', 'fffff000:03fff', 'fffff000:01fff', 'fffff000:01fff',
      'fffff300:03fff', 'ffffffc0:03fff', 'ffffffc0:00fff', 'ffffffe0:007ff',
      'fffffff0:003ff', 'ffffffe0:001ff', 'ffffff80:000ff', 'ffffffc0:0007f',
      'ffffffc0:0003f', 'ffffffc0:0000f', 'fffff800:00003', '3f3ff000:00000',
      '001fc000:00000', '000fc000:00000', '0007c000:00000', '0003c000:00000',
      '00000000:00000', '00000000:00000'
    ]
  ];

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function decodeBirdMask(rows) {
    var points = [];
    for (var y = 0; y < rows.length; y++) {
      var words = rows[y].split(':');
      var low = parseInt(words[0], 16) >>> 0;
      var high = parseInt(words[1], 16) >>> 0;
      for (var x = 0; x < BIRD_MASK_WIDTH; x++) {
        var word = x < 32 ? low : high;
        var bit = x < 32 ? x : x - 32;
        if ((word & (1 << bit)) !== 0) {
          points.push(
            (x + 0.5) / BIRD_MASK_WIDTH - 0.5,
            (y + 0.5) / BIRD_MASK_HEIGHT - 0.5
          );
        }
      }
    }
    return points;
  }

  var BIRD_MASK_POINTS = BIRD_MASK_ROWS.map(decodeBirdMask);

  function birdFrameIndex(world) {
    var bird = world.bird;
    if (world.state === STATES.DYING || world.state === STATES.DEAD) return 1;
    if (world.state === STATES.READY) {
      return WING_CYCLE[Math.floor(bird.animationTime * 8) % WING_CYCLE.length];
    }
    if (bird.flapAge < 0.32) {
      return WING_CYCLE[Math.floor(bird.flapAge * 16) % WING_CYCLE.length];
    }
    return bird.velocityY < 0 ? 0 : 1;
  }

  function create(options) {
    options = options || {};
    var random = options.random || Math.random;
    var collisionShape = { points: [], top: 0, bottom: 0, pixelPad: 0 };
    var world = {
      width: Math.max(1, options.width || BASE_WIDTH),
      height: Math.max(1, options.height || 700),
      state: STATES.READY,
      score: 0,
      bird: null,
      pipes: [],
      metrics: {},
      spawnDistance: 0,
      nextPipeId: 1,
      deathTime: 0
    };

    function configure() {
      var scale = clamp(world.width / BASE_WIDTH, 0.72, 1.6);
      var gap = Math.min(world.height * 0.24, 164 * scale);
      world.metrics = {
        scale: scale,
        gravity: 1500 * scale,
        flapVelocity: -430 * scale,
        maxFallVelocity: 720 * scale,
        pipeSpeed: 170 * scale,
        pipeSpacing: 225 * scale,
        pipeGap: Math.max(134 * scale, gap),
        pipeWidth: 72 * scale,
        pipeCapWidth: 85 * scale,
        pipeCapHeight: 38 * scale,
        maxPipeShift: 160 * scale,
        birdDrawWidth: 56 * scale,
        birdDrawHeight: 50 * scale,
        birdX: Math.max(76 * scale, world.width * 0.25),
        floorY: world.height - Math.max(5, 6 * scale),
        pipeMargin: Math.max(62 * scale, world.height * 0.09)
      };
    }

    function reset() {
      configure();
      var y = world.height * 0.46;
      world.state = STATES.READY;
      world.score = 0;
      world.bird = {
        y: y,
        previousY: y,
        velocityY: 0,
        rotation: 0,
        previousRotation: 0,
        animationTime: 0,
        flapAge: 1,
        frameIndex: 0
      };
      world.pipes = [];
      world.spawnDistance = world.metrics.pipeSpacing * 0.74;
      world.nextPipeId = 1;
      world.deathTime = 0;
    }

    function resize(width, height) {
      var oldHeight = world.height;
      world.width = Math.max(1, width);
      world.height = Math.max(1, height);
      configure();
      if (world.state === STATES.READY) {
        world.bird.y = world.height * 0.46;
        world.bird.previousY = world.bird.y;
      } else if (oldHeight !== world.height) {
        updateCollisionShape();
        if (collisionShape.bottom > world.metrics.floorY) {
          var shift = collisionShape.bottom - world.metrics.floorY;
          world.bird.y -= shift;
          world.bird.previousY -= shift;
        }
      }
      for (var i = 0; i < world.pipes.length; i++) {
        world.pipes[i].gap = world.metrics.pipeGap;
        world.pipes[i].cy = clampPipeCenter(world.pipes[i].cy);
      }
    }

    function clampPipeCenter(center) {
      var m = world.metrics;
      var low = m.pipeMargin + m.pipeGap / 2;
      var high = m.floorY - m.pipeMargin - m.pipeGap / 2;
      return clamp(center, low, Math.max(low, high));
    }

    function spawnPipe() {
      var m = world.metrics;
      var low = m.pipeMargin + m.pipeGap / 2;
      var high = Math.max(low, m.floorY - m.pipeMargin - m.pipeGap / 2);
      var center = low + random() * (high - low);
      var previous = world.pipes.length
        ? world.pipes[world.pipes.length - 1].cy
        : world.height * 0.5;
      center = clamp(
        center,
        previous - m.maxPipeShift,
        previous + m.maxPipeShift
      );
      center = clampPipeCenter(center);
      var x = world.width + m.pipeCapWidth;
      world.pipes.push({
        id: world.nextPipeId++,
        x: x,
        previousX: x,
        cy: center,
        gap: m.pipeGap,
        passed: false
      });
    }

    function start() {
      if (world.state !== STATES.READY) return [];
      world.state = STATES.PLAYING;
      return flap();
    }

    function flap() {
      if (world.state === STATES.READY) return start();
      if (world.state !== STATES.PLAYING) return [];
      world.bird.velocityY = world.metrics.flapVelocity;
      world.bird.flapAge = 0;
      world.bird.animationTime = 0;
      world.bird.frameIndex = 0;
      world.bird.previousY = world.bird.y;
      world.bird.previousRotation = world.bird.rotation;
      return [{ type: 'flap' }];
    }

    function beginDeath() {
      if (world.state !== STATES.PLAYING) return [];
      world.state = STATES.DYING;
      world.deathTime = 0;
      world.bird.velocityY = Math.max(world.bird.velocityY, 90 * world.metrics.scale);
      world.bird.frameIndex = 1;
      return [{ type: 'hit' }];
    }

    function restart() {
      reset();
      world.state = STATES.PLAYING;
      return flap();
    }

    function updateBirdPose(dt) {
      var bird = world.bird;
      var m = world.metrics;
      var target;
      if (bird.velocityY < -40 * m.scale) {
        target = -0.34;
      } else {
        target = clamp(-0.08 + bird.velocityY / (650 * m.scale), -0.08, 1.42);
      }
      var response = target < bird.rotation ? 18 : 4.6;
      bird.rotation += (target - bird.rotation) * (1 - Math.exp(-response * dt));
    }

    function updateCollisionShape() {
      var m = world.metrics;
      var bird = world.bird;
      var mask = BIRD_MASK_POINTS[bird.frameIndex] || BIRD_MASK_POINTS[1];
      var output = collisionShape.points;
      var cos = Math.cos(bird.rotation);
      var sin = Math.sin(bird.rotation);
      var top = Infinity;
      var bottom = -Infinity;
      output.length = mask.length;

      for (var i = 0; i < mask.length; i += 2) {
        var localX = mask[i] * m.birdDrawWidth;
        var localY = mask[i + 1] * m.birdDrawHeight;
        var worldX = m.birdX + localX * cos - localY * sin;
        var worldY = bird.y + localX * sin + localY * cos;
        output[i] = worldX;
        output[i + 1] = worldY;
        top = Math.min(top, worldY);
        bottom = Math.max(bottom, worldY);
      }

      collisionShape.pixelPad = Math.max(
        m.birdDrawWidth / BIRD_MASK_WIDTH,
        m.birdDrawHeight / BIRD_MASK_HEIGHT
      ) * 0.5;
      collisionShape.top = top - collisionShape.pixelPad;
      collisionShape.bottom = bottom + collisionShape.pixelPad;
      return collisionShape;
    }

    function shiftCollisionShapeY(amount) {
      for (var i = 1; i < collisionShape.points.length; i += 2) {
        collisionShape.points[i] += amount;
      }
      collisionShape.top += amount;
      collisionShape.bottom += amount;
    }

    function intersectsPipe(pipe) {
      var m = world.metrics;
      var top = pipe.cy - pipe.gap / 2;
      var bottom = pipe.cy + pipe.gap / 2;
      var shape = collisionShape;
      var points = shape.points;
      var pad = shape.pixelPad;

      if (shape.top >= top && shape.bottom <= bottom) {
        return false;
      }
      if (Math.abs(pipe.x - m.birdX) >
          (m.pipeCapWidth + m.birdDrawWidth) / 2 + pad) {
        return false;
      }

      for (var i = 0; i < points.length; i += 2) {
        var x = points[i];
        var y = points[i + 1];
        var obstacleWidth = 0;
        if (y - pad < top) {
          obstacleWidth = y + pad > top - m.pipeCapHeight
            ? m.pipeCapWidth
            : m.pipeWidth;
        } else if (y + pad > bottom) {
          obstacleWidth = y - pad < bottom + m.pipeCapHeight
            ? m.pipeCapWidth
            : m.pipeWidth;
        }
        if (obstacleWidth &&
            Math.abs(x - pipe.x) < obstacleWidth / 2 + pad) {
          return true;
        }
      }
      return false;
    }

    function step(dt) {
      var events = null;
      var bird = world.bird;
      var m = world.metrics;
      bird.previousY = bird.y;
      bird.previousRotation = bird.rotation;
      bird.animationTime += dt;
      bird.flapAge += dt;

      if (world.state === STATES.READY) {
        bird.y = world.height * 0.46 + Math.sin(bird.animationTime * 4.2) * 7 * m.scale;
        bird.rotation = 0;
        bird.frameIndex = birdFrameIndex(world);
        return EMPTY_EVENTS;
      }

      if (world.state === STATES.DEAD) return EMPTY_EVENTS;

      bird.velocityY = Math.min(m.maxFallVelocity, bird.velocityY + m.gravity * dt);
      bird.y += bird.velocityY * dt;
      updateBirdPose(dt);
      bird.frameIndex = birdFrameIndex(world);

      if (world.state === STATES.DYING) {
        for (var frozen = 0; frozen < world.pipes.length; frozen++) {
          world.pipes[frozen].previousX = world.pipes[frozen].x;
        }
        world.deathTime += dt;
        bird.rotation += (1.5 - bird.rotation) * (1 - Math.exp(-7 * dt));
        updateCollisionShape();
        if (collisionShape.bottom >= m.floorY) {
          bird.y -= collisionShape.bottom - m.floorY;
          bird.velocityY = 0;
        }
        if (collisionShape.bottom >= m.floorY || world.deathTime >= 1.05) {
          world.state = STATES.DEAD;
          return [{ type: 'dead' }];
        }
        return EMPTY_EVENTS;
      }

      updateCollisionShape();
      if (collisionShape.top < 0) {
        var ceilingShift = -collisionShape.top;
        bird.y += ceilingShift;
        shiftCollisionShapeY(ceilingShift);
        bird.velocityY = Math.max(0, bird.velocityY);
      }

      world.spawnDistance += m.pipeSpeed * dt;
      if (world.spawnDistance >= m.pipeSpacing) {
        world.spawnDistance -= m.pipeSpacing;
        spawnPipe();
      }

      for (var i = world.pipes.length - 1; i >= 0; i--) {
        var pipe = world.pipes[i];
        pipe.previousX = pipe.x;
        pipe.x -= m.pipeSpeed * dt;
        if (!pipe.passed && pipe.x + m.pipeCapWidth / 2 < m.birdX) {
          pipe.passed = true;
          world.score++;
          if (!events) events = [];
          events.push({ type: 'score', score: world.score });
        }
        if (pipe.x < -m.pipeCapWidth) {
          world.pipes.splice(i, 1);
        } else if (intersectsPipe(pipe)) {
          return events ? events.concat(beginDeath()) : beginDeath();
        }
      }

      if (collisionShape.bottom >= m.floorY) {
        return events ? events.concat(beginDeath()) : beginDeath();
      }
      return events || EMPTY_EVENTS;
    }

    reset();
    return {
      world: world,
      states: STATES,
      flap: flap,
      restart: restart,
      crash: beginDeath,
      resize: resize,
      step: step
    };
  }

  return { create: create, STATES: STATES };
});
