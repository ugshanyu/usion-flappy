'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var FlappyEngine = require('../game-engine.js');
var CONFIG = FlappyEngine.CONFIG;

function stepMany(engine, count) {
  var events = [];
  for (var i = 0; i < count; i++) events = events.concat(engine.step());
  return events;
}

test('uses the FlapPyBird legacy world and timing constants', function () {
  assert.deepEqual(CONFIG, {
    fps: 30,
    width: 288,
    height: 512,
    baseY: 512 * 0.79,
    gapSize: 100,
    pipeWidth: 52,
    pipeHeight: 320,
    pipeVelocityX: -128 / 30,
    playerX: 57,
    playerWidth: 34,
    playerHeight: 24
  });
});

test('welcome animation follows the reference eight-pixel bob and wing cycle', function () {
  var engine = FlappyEngine.create();
  stepMany(engine, 8);

  assert.equal(engine.world.state, FlappyEngine.STATES.READY);
  assert.equal(engine.world.player.shmValue, 8);
  assert.equal(engine.world.player.y, 252);
  assert.equal(engine.world.player.frameIndex, 1);

  engine.step();
  assert.equal(engine.world.player.shmValue, 7);
});

test('first tap creates the two reference pipes and starts with legacy velocity', function () {
  var engine = FlappyEngine.create({ random: function () { return 0; } });
  var events = engine.flap();

  assert.equal(engine.world.state, FlappyEngine.STATES.PLAYING);
  assert.equal(engine.world.player.velocityY, -9);
  assert.deepEqual(events.map(function (event) { return event.type; }), ['start', 'flap']);
  assert.equal(engine.world.pipes.length, 2);
  assert.equal(engine.world.pipes[0].x, 488);
  assert.equal(engine.world.pipes[1].x, 632);
  assert.equal(engine.world.pipes[0].gapY, 80);
});

test('normal and tapped frames preserve the reference velocity and rotation order', function () {
  var engine = FlappyEngine.create({ random: function () { return 0.5; } });
  engine.flap();
  var initialY = engine.world.player.y;
  engine.step();

  assert.equal(engine.world.player.velocityY, -8);
  assert.equal(engine.world.player.y, initialY - 8);
  assert.equal(engine.world.player.rotation, 42);

  engine.flap();
  engine.step();
  assert.equal(engine.world.player.velocityY, -9);
  assert.equal(engine.world.player.y, initialY - 17);
  assert.equal(engine.world.player.rotation, 42);
});

test('flapping leaves pipe positions and geometry untouched until the next tick', function () {
  var engine = FlappyEngine.create({ random: function () { return 0.5; } });
  engine.flap();
  engine.step();
  var before = JSON.parse(JSON.stringify(engine.world.pipes));

  engine.flap();

  assert.deepEqual(engine.world.pipes, before);
});

test('queued flap is applied before collision exactly as in the reference loop', function () {
  var engine = FlappyEngine.create({ random: function () { return 0; } });
  engine.flap();
  engine.world.player.velocityY = 5;
  engine.world.pipes[0].x = CONFIG.playerX;
  engine.world.pipes[0].previousX = CONFIG.playerX;
  engine.flap();
  var events = engine.step();

  assert.equal(events[0].type, 'hit');
  assert.equal(engine.world.player.velocityY, -9);
  assert.equal(engine.world.player.rotation, 45);
});

test('pipes keep the legacy constant speed regardless of score', function () {
  var engine = FlappyEngine.create({ random: function () { return 0.5; } });
  engine.flap();
  var startX = engine.world.pipes[0].x;
  engine.world.score = 100;
  engine.step();

  assert.equal(engine.world.pipes[0].x, startX + CONFIG.pipeVelocityX);
});

test('score uses the original four-pixel midpoint crossing window', function () {
  var engine = FlappyEngine.create({ random: function () { return 0.5; } });
  engine.flap();
  engine.world.player.y = 220;
  engine.world.player.previousY = 220;
  engine.world.pipes[0].gapY = 200;
  engine.world.pipes[0].x =
    CONFIG.playerX + CONFIG.playerWidth / 2 - CONFIG.pipeWidth / 2;
  var events = engine.step();

  assert.equal(engine.world.score, 1);
  assert.ok(events.some(function (event) { return event.type === 'score'; }));
});

test('pipe collision freezes the world and runs the reference crash fall', function () {
  var engine = FlappyEngine.create({ random: function () { return 0; } });
  engine.flap();
  engine.world.pipes[0].x = CONFIG.playerX;
  engine.world.pipes[0].previousX = CONFIG.playerX;
  var events = engine.step();
  var frozenX = engine.world.pipes[0].x;

  assert.equal(engine.world.state, FlappyEngine.STATES.CRASH);
  assert.equal(events[0].type, 'hit');
  stepMany(engine, 60);
  assert.equal(engine.world.pipes[0].x, frozenX);
  assert.equal(engine.world.state, FlappyEngine.STATES.DEAD);

  engine.restart();
  assert.equal(engine.world.state, FlappyEngine.STATES.READY);
  assert.equal(engine.world.pipes.length, 0);
});
