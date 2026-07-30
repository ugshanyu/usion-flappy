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

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function create(options) {
    options = options || {};
    var random = options.random || Math.random;
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
      var gap = Math.min(world.height * 0.24, 135 * scale);
      world.metrics = {
        scale: scale,
        gravity: 1500 * scale,
        flapVelocity: -430 * scale,
        maxFallVelocity: 720 * scale,
        pipeSpeed: 173 * scale,
        pipeSpacing: 195 * scale,
        pipeGap: Math.max(112 * scale, gap),
        pipeWidth: 72 * scale,
        pipeCapWidth: 85 * scale,
        pipeCapHeight: 38 * scale,
        maxPipeShift: 190 * scale,
        birdDrawWidth: 52 * scale,
        birdDrawHeight: 46 * scale,
        birdHitWidth: 40 * scale,
        birdHitHeight: 28 * scale,
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
        flapAge: 1
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
        var maxY = world.metrics.floorY - world.metrics.birdHitHeight / 2;
        world.bird.y = Math.min(world.bird.y, maxY);
        world.bird.previousY = Math.min(world.bird.previousY, maxY);
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
      if (world.pipes.length) {
        var previous = world.pipes[world.pipes.length - 1].cy;
        center = clamp(
          center,
          previous - m.maxPipeShift,
          previous + m.maxPipeShift
        );
      }
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
      world.bird.previousY = world.bird.y;
      world.bird.previousRotation = world.bird.rotation;
      return [{ type: 'flap' }];
    }

    function beginDeath() {
      if (world.state !== STATES.PLAYING) return [];
      world.state = STATES.DYING;
      world.deathTime = 0;
      world.bird.velocityY = Math.max(world.bird.velocityY, 90 * world.metrics.scale);
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

    function intersectsPipe(pipe) {
      var m = world.metrics;
      var bird = world.bird;
      var top = pipe.cy - pipe.gap / 2;
      var bottom = pipe.cy + pipe.gap / 2;
      var birdTop = bird.y - m.birdHitHeight / 2;
      var birdBottom = bird.y + m.birdHitHeight / 2;
      var obstacleWidth;

      if (birdTop < top) {
        obstacleWidth = birdBottom > top - m.pipeCapHeight
          ? m.pipeCapWidth
          : m.pipeWidth;
      } else if (birdBottom > bottom) {
        obstacleWidth = birdTop < bottom + m.pipeCapHeight
          ? m.pipeCapWidth
          : m.pipeWidth;
      } else {
        return false;
      }

      return Math.abs(pipe.x - m.birdX) <
        (obstacleWidth + m.birdHitWidth) / 2;
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
        return EMPTY_EVENTS;
      }

      if (world.state === STATES.DEAD) return EMPTY_EVENTS;

      bird.velocityY = Math.min(m.maxFallVelocity, bird.velocityY + m.gravity * dt);
      bird.y += bird.velocityY * dt;
      updateBirdPose(dt);

      if (world.state === STATES.DYING) {
        for (var frozen = 0; frozen < world.pipes.length; frozen++) {
          world.pipes[frozen].previousX = world.pipes[frozen].x;
        }
        world.deathTime += dt;
        bird.rotation += (1.5 - bird.rotation) * (1 - Math.exp(-7 * dt));
        var ground = m.floorY - m.birdHitHeight / 2;
        if (bird.y >= ground) {
          bird.y = ground;
          bird.velocityY = 0;
        }
        if (bird.y >= ground || world.deathTime >= 1.05) {
          world.state = STATES.DEAD;
          return [{ type: 'dead' }];
        }
        return EMPTY_EVENTS;
      }

      if (bird.y < m.birdHitHeight / 2) {
        bird.y = m.birdHitHeight / 2;
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

      if (bird.y + m.birdHitHeight / 2 >= m.floorY) {
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
