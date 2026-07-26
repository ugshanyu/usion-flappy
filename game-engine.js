/*
 * Mechanics ported from sourabhv/FlapPyBird legacy flappy.py at
 * commit 038359dc6122f8d851e816ddb3e7d28229d585e5 (MIT).
 * Modified in July 2026 for JavaScript/Pixi rendering and Usion assets.
 * See licenses/FlapPyBird-MIT.txt and THIRD_PARTY_NOTICES.md.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlappyEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var STATES = { READY: 'ready', PLAYING: 'playing', CRASH: 'crash', DEAD: 'dead' };
  var CONFIG = {
    fps: 30,
    width: 288,
    height: 512,
    baseY: 512 * 0.79,
    gapSize: 100,
    pipeWidth: 52,
    pipeHeight: 320,
    pipeVelocityX: -128 / 30,
    playerX: Math.floor(288 * 0.2),
    playerWidth: 34,
    playerHeight: 24
  };
  var EMPTY_EVENTS = [];
  var ANIMATION = [0, 1, 2, 1];

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
      a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function create(options) {
    options = options || {};
    var random = options.random || Math.random;
    var world = {
      state: STATES.READY,
      score: 0,
      player: null,
      pipes: [],
      loopIteration: 0,
      animationCursor: 0,
      nextPipeId: 1,
      pendingFlap: false,
      groundCrash: false
    };

    function reset() {
      var y = Math.floor((CONFIG.height - CONFIG.playerHeight) / 2);
      world.state = STATES.READY;
      world.score = 0;
      world.player = {
        y: y,
        previousY: y,
        velocityY: 0,
        rotation: 0,
        previousRotation: 0,
        frameIndex: 0,
        shmValue: 0,
        shmDirection: 1,
        flapped: false
      };
      world.pipes = [];
      world.loopIteration = 0;
      world.animationCursor = 0;
      world.nextPipeId = 1;
      world.pendingFlap = false;
      world.groundCrash = false;
    }

    function nextAnimationFrame() {
      world.animationCursor = (world.animationCursor + 1) % ANIMATION.length;
      world.player.frameIndex = ANIMATION[world.animationCursor];
    }

    function randomGapY() {
      var range = Math.floor(CONFIG.baseY * 0.6 - CONFIG.gapSize);
      return Math.floor(random() * range) + Math.floor(CONFIG.baseY * 0.2);
    }

    function makePipe(x) {
      return {
        id: world.nextPipeId++,
        x: x,
        previousX: x,
        gapY: randomGapY()
      };
    }

    function spawnInitialPipes() {
      world.pipes = [
        makePipe(CONFIG.width + 200),
        makePipe(CONFIG.width + 200 + CONFIG.width / 2)
      ];
    }

    function start() {
      if (world.state !== STATES.READY) return EMPTY_EVENTS;
      world.state = STATES.PLAYING;
      world.player.velocityY = -9;
      world.player.rotation = 45;
      world.player.previousRotation = 45;
      world.player.flapped = false;
      world.loopIteration = 0;
      spawnInitialPipes();
      return [{ type: 'start' }, { type: 'flap' }];
    }

    function flap() {
      if (world.state === STATES.READY) return start();
      if (world.state !== STATES.PLAYING) return EMPTY_EVENTS;
      world.pendingFlap = true;
      return EMPTY_EVENTS;
    }

    function pipeCollision(pipe) {
      var player = {
        x: CONFIG.playerX + 2,
        y: world.player.y + 2,
        width: CONFIG.playerWidth - 4,
        height: CONFIG.playerHeight - 4
      };
      var capHeight = 23;
      var upperBody = {
        x: pipe.x + 4,
        y: pipe.gapY - CONFIG.pipeHeight,
        width: CONFIG.pipeWidth - 8,
        height: CONFIG.pipeHeight - capHeight
      };
      var upperCap = {
        x: pipe.x,
        y: pipe.gapY - capHeight,
        width: CONFIG.pipeWidth,
        height: capHeight
      };
      var lowerCap = {
        x: pipe.x,
        y: pipe.gapY + CONFIG.gapSize,
        width: CONFIG.pipeWidth,
        height: capHeight
      };
      var lowerBody = {
        x: pipe.x + 4,
        y: pipe.gapY + CONFIG.gapSize + capHeight,
        width: CONFIG.pipeWidth - 8,
        height: CONFIG.pipeHeight - capHeight
      };
      return overlaps(player, upperBody) || overlaps(player, upperCap) ||
        overlaps(player, lowerCap) || overlaps(player, lowerBody);
    }

    function beginCrash(groundCrash) {
      world.state = STATES.CRASH;
      world.groundCrash = groundCrash;
      world.pendingFlap = false;
      world.player.flapped = false;
      return [{ type: 'hit', groundCrash: groundCrash }];
    }

    function collisionEvents() {
      if (world.player.y + CONFIG.playerHeight >= CONFIG.baseY - 1) {
        return beginCrash(true);
      }
      for (var i = 0; i < world.pipes.length; i++) {
        if (pipeCollision(world.pipes[i])) return beginCrash(false);
      }
      return null;
    }

    function scoreEvents() {
      var playerMid = CONFIG.playerX + CONFIG.playerWidth / 2;
      for (var i = 0; i < world.pipes.length; i++) {
        var pipeMid = world.pipes[i].x + CONFIG.pipeWidth / 2;
        if (pipeMid <= playerMid && playerMid < pipeMid + 4) {
          world.score++;
          return [{ type: 'score', score: world.score }];
        }
      }
      return null;
    }

    function stepReady() {
      var player = world.player;
      player.previousY = player.y;
      player.previousRotation = player.rotation;
      if ((world.loopIteration + 1) % 5 === 0) nextAnimationFrame();
      world.loopIteration = (world.loopIteration + 1) % CONFIG.fps;
      if (Math.abs(player.shmValue) === 8) player.shmDirection *= -1;
      player.shmValue += player.shmDirection;
      player.y = Math.floor((CONFIG.height - CONFIG.playerHeight) / 2) +
        player.shmValue;
      return EMPTY_EVENTS;
    }

    function stepPlaying() {
      var player = world.player;
      if (world.pendingFlap && player.y > -2 * CONFIG.playerHeight) {
        player.velocityY = -9;
        player.flapped = true;
        player.rotation = 45;
      }
      world.pendingFlap = false;

      var collision = collisionEvents();
      if (collision) return collision;
      var events = scoreEvents();
      player.previousY = player.y;
      player.previousRotation = player.rotation;

      if ((world.loopIteration + 1) % 3 === 0) nextAnimationFrame();
      world.loopIteration = (world.loopIteration + 1) % CONFIG.fps;
      if (player.rotation > -90) player.rotation -= 3;
      if (player.velocityY < 10 && !player.flapped) player.velocityY += 1;
      if (player.flapped) player.flapped = false;
      player.y += Math.min(
        player.velocityY,
        CONFIG.baseY - player.y - CONFIG.playerHeight
      );

      for (var i = 0; i < world.pipes.length; i++) {
        world.pipes[i].previousX = world.pipes[i].x;
        world.pipes[i].x += CONFIG.pipeVelocityX;
      }
      if (world.pipes.length < 3 && world.pipes[0].x > 0 && world.pipes[0].x < 5) {
        world.pipes.push(makePipe(CONFIG.width + 10));
      }
      if (world.pipes.length && world.pipes[0].x < -CONFIG.pipeWidth) {
        world.pipes.shift();
      }
      return events || EMPTY_EVENTS;
    }

    function stepCrash() {
      var player = world.player;
      player.previousY = player.y;
      player.previousRotation = player.rotation;
      for (var i = 0; i < world.pipes.length; i++) {
        world.pipes[i].previousX = world.pipes[i].x;
      }
      if (player.y + CONFIG.playerHeight < CONFIG.baseY - 1) {
        player.y += Math.min(
          player.velocityY,
          CONFIG.baseY - player.y - CONFIG.playerHeight
        );
      }
      if (player.velocityY < 15) player.velocityY += 2;
      if (!world.groundCrash && player.rotation > -90) player.rotation -= 7;
      if (player.y + CONFIG.playerHeight >= CONFIG.baseY - 1) {
        world.state = STATES.DEAD;
        return [{ type: 'dead' }];
      }
      return EMPTY_EVENTS;
    }

    function step() {
      if (world.state === STATES.READY) return stepReady();
      if (world.state === STATES.PLAYING) return stepPlaying();
      if (world.state === STATES.CRASH) return stepCrash();
      return EMPTY_EVENTS;
    }

    reset();
    return {
      world: world,
      states: STATES,
      flap: flap,
      restart: function () { reset(); return EMPTY_EVENTS; },
      step: step
    };
  }

  return { create: create, STATES: STATES, CONFIG: CONFIG };
});
